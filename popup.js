// 在文件顶部修改配置
marked.setOptions({
    breaks: true,
    highlight: function(code, language) {
        // 如果指定了语言
        if (language) {
            try {
                // 尝试使用指定的语言进行高亮
                return hljs.highlight(code, {
                    language: language.toLowerCase(),
                    ignoreIllegals: true
                }).value;
            } catch (err) {
                console.log(`Language highlight error for ${language}:`, err);
                // 如果指定语言失败，回退到自动检测
                return hljs.highlightAuto(code).value;
            }
        }
        // 没有指定语言时自动检测
        return hljs.highlightAuto(code).value;
    },
    langPrefix: 'hljs language-' // 添加 hljs 类以应用样式
});

console.log('Popup script loaded');  // 检查脚本是否加载

// 在文件顶部添加缓存相关函数
async function saveCache(url, content) {
    await chrome.storage.local.set({
        [`debug_cache_${url}`]: {
            content: content,
            timestamp: Date.now()
        }
    });
}

async function loadCache(url) {
    const data = await chrome.storage.local.get(`debug_cache_${url}`);
    return data[`debug_cache_${url}`];
}

// 修改 DOMContentLoaded 事件处理
document.addEventListener('DOMContentLoaded', async () => {
    // 获取当前标签页URL
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const url = tab.url;
    
    // 检查缓存
    const cache = await loadCache(url);
    if (cache) {
        const resultDiv = document.getElementById('debugResult');
        resultDiv.innerHTML = marked.parse(cache.content);
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }

    chrome.runtime.onMessage.addListener((message) => {
        console.log('DOMContentLoaded收到消息:', message);
    });
});

document.getElementById('debugBtn').addEventListener('click', async () => {
    console.log('Button clicked');
    const resultDiv = document.getElementById('debugResult');
    const reasoningDiv = document.getElementById('reasoningResult');
    const reasoningContent = document.getElementById('reasoningContent');
    
    resultDiv.innerHTML = "<em>正在分析代码...</em>";
    reasoningDiv.style.display = 'none';
    reasoningContent.textContent = '';
    
    let contentBuffer = '';
    let reasoningBuffer = '';
    
    // 获取选择的模型并转换为实际的API参数名
    const selectedModel = document.getElementById('modelSelect').value;
    
    // 消息监听器
    const messageListener = (message) => {
        if (message.type === 'streamContent') {
            if (message.isReasoning) {
                // 处理推理内容
                reasoningBuffer += message.content;
                reasoningDiv.style.display = 'block';
                reasoningContent.textContent = reasoningBuffer;
            } else {
                // 处理普通内容
                contentBuffer += message.content;
                resultDiv.innerHTML = marked.parse(contentBuffer);
                document.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
            // 自动滚动到底部
            resultDiv.scrollTop = resultDiv.scrollHeight;
        } else if (message.type === 'streamComplete') {
            // 最终渲染一次确保完整性
            resultDiv.innerHTML = marked.parse(contentBuffer);
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
            contentBuffer = '';
            reasoningBuffer = '';
        }
    };

    // 先移除旧的监听器避免重复
    chrome.runtime.onMessage.removeListener(messageListener);
    chrome.runtime.onMessage.addListener(messageListener);

    try {
        // 获取当前标签页
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // 从页面获取内容
        const content = await chrome.tabs.sendMessage(tab.id, {action: "getContent"});
        console.log(content);

        // 发送到background script处理，使用转换后的model参数
        await chrome.runtime.sendMessage({
            action: "debugCode",
            content: content,
            model: selectedModel
        });

    } catch (error) {
        resultDiv.textContent = "错误: " + error.message;
    }
});
// 确保在 DOMContentLoaded 事件后注册监听器
document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.onMessage.addListener((message) => {
        console.log('DOMContentLoaded收到消息:', message);
        // ... 其他代码 ...
    });
}); 
