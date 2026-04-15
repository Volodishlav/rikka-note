use git2::{Repository, Signature, Cred, RemoteCallbacks};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GitConfig {
    #[serde(rename = "remoteUrl")]
    pub remote_url: String,
    pub branch: String,
    pub token: String, // GitHub PAT
}

#[tauri::command]
pub async fn git_commit_and_push(
    repo_path: String,
    config: GitConfig,
    message: String,
) -> Result<String, String> {
    println!("=== [DEBUG] git_commit_and_push: repo_path={}, remote={}, branch={}", repo_path, config.remote_url, config.branch);
    let repo = Repository::open(&repo_path).map_err(|e| format!("无法打开仓库: {}", e))?;
    
    // 1. Add all
    let mut index = repo.index().map_err(|e| e.to_string())?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None).map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;
    
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    
    // 2. Commit
    let signature = Signature::now("Rikka Note", "sync@rikka.note").map_err(|e| e.to_string())?;
    let parent_commit = match repo.head() {
        Ok(head) => Some(head.peel_to_commit().map_err(|e| e.to_string())?),
        Err(_) => None,
    };
    
    let parents = match &parent_commit {
        Some(c) => vec![c],
        None => vec![],
    };
    
    repo.commit(
        Some("HEAD"),
        &signature,
        &signature,
        &message,
        &tree,
        &parents,
    ).map_err(|e| e.to_string())?;

    // 3. Push
    let mut remote = repo.find_remote("origin").or_else(|_| repo.remote("origin", &config.remote_url)).map_err(|e| e.to_string())?;
    
    // 显式配置 https 认证
    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        let user = username_from_url.unwrap_or("git");
        println!("=== [DEBUG] Git Auth: using token for user {}", user);
        Cred::userpass_plaintext(user, &config.token)
    });

    let mut options = git2::PushOptions::new();
    options.remote_callbacks(callbacks);

    println!("=== [DEBUG] Pushing to remote: {}", config.remote_url);
    remote.push(&[format!("refs/heads/{}:refs/heads/{}", config.branch, config.branch)], Some(&mut options))
        .map_err(|e| {
            println!("=== [ERROR] Push failed: {}", e);
            format!("推送失败: {} (代码: {:?})", e.message(), e.code())
        })?;

    Ok("同步成功".to_string())
}

#[tauri::command]
pub async fn git_pull(
    repo_path: String,
    config: GitConfig,
) -> Result<String, String> {
    println!("=== [DEBUG] git_pull: repo_path={}, remote={}, branch={}", repo_path, config.remote_url, config.branch);
    let repo = Repository::open(&repo_path).map_err(|e| format!("无法打开仓库: {}", e))?;
    let mut remote = repo.find_remote("origin").map_err(|e| e.to_string())?;

    let mut callbacks = RemoteCallbacks::new();
    callbacks.credentials(|_url, username_from_url, _allowed_types| {
        let user = username_from_url.unwrap_or("git");
        println!("=== [DEBUG] Git Auth (Fetch): using token for user {}", user);
        Cred::userpass_plaintext(user, &config.token)
    });

    let mut fetch_options = git2::FetchOptions::new();
    fetch_options.remote_callbacks(callbacks);

    println!("=== [DEBUG] Fetching from remote: {}", config.remote_url);
    remote.fetch(&[&config.branch], Some(&mut fetch_options), None).map_err(|e| {
        println!("=== [ERROR] Fetch failed: {}", e);
        format!("拉取失败: {} (代码: {:?})", e.message(), e.code())
    })?;

    // 简并合并逻辑 (仅支持快进或简单的本地合并)
    let fetch_head = repo.find_reference("FETCH_HEAD").map_err(|e| e.to_string())?;
    let fetch_commit = repo.reference_to_annotated_commit(&fetch_head).map_err(|e| e.to_string())?;
    
    let (analysis, _) = repo.merge_analysis(&[&fetch_commit]).map_err(|e| e.to_string())?;

    if analysis.is_fast_forward() {
        let mut reference = repo.find_reference(&format!("refs/heads/{}", config.branch)).map_err(|e| e.to_string())?;
        reference.set_target(fetch_commit.id(), "Fast-forward").map_err(|e| e.to_string())?;
        repo.set_head(&format!("refs/heads/{}", config.branch)).map_err(|e| e.to_string())?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force())).map_err(|e| e.to_string())?;
        Ok("已快速合并 (Fast-forward)".to_string())
    } else if analysis.is_normal() {
        // 普通合并比较复杂，此处先做提示
        Err("检测到版本冲突，请手动处理或使用命令行合并".to_string())
    } else {
        Ok("已经是最新版本".to_string())
    }
}

#[tauri::command]
pub async fn git_status(repo_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&repo_path).map_err(|e| e.to_string())?;
    let mut status_options = git2::StatusOptions::new();
    status_options.include_untracked(true);
    let statuses = repo.statuses(Some(&mut status_options)).map_err(|e| e.to_string())?;
    
    let mut res = Vec::new();
    for entry in statuses.iter() {
        if let Some(path) = entry.path() {
            res.push(path.to_string());
        }
    }
    Ok(res)
}

#[tauri::command]
pub async fn git_init_repo(repo_path: String, remote_url: Option<String>) -> Result<String, String> {
    let repo = Repository::init(&repo_path).map_err(|e| format!("初始化 Git 失败: {}", e))?;
    if let Some(url) = remote_url {
        if !url.is_empty() {
            repo.remote("origin", &url).map_err(|e| format!("设置远端失败: {}", e))?;
        }
    }
    Ok("Git 初始化成功".to_string())
}
