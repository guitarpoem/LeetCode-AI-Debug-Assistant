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

// 修改缓存相关函数
async function saveCache(url, model, data) {
    await chrome.storage.local.set({
        [`debug_cache_${url}_${model}`]: {
            content: data.content,
            reasoning: data.reasoning,
            timestamp: Date.now()
        }
    });
}

async function loadCache(url, model) {
    const data = await chrome.storage.local.get(`debug_cache_${url}_${model}`);
    return data[`debug_cache_${url}_${model}`];
}

// 修改 DOMContentLoaded 事件处理
document.addEventListener('DOMContentLoaded', async () => {
    // 获取当前标签页URL和选择的模型
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const url = tab.url;
    const selectedModel = document.getElementById('modelSelect').value;
    
    // 检查缓存
    const cache = await loadCache(url, selectedModel);
    if (cache) {
        const resultDiv = document.getElementById('debugResult');
        const reasoningDiv = document.getElementById('reasoningResult');
        const reasoningContent = document.getElementById('reasoningContent');
        
        resultDiv.innerHTML = marked.parse(cache.content);
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        // 如果是 deepseek-reasoner 模型且有推理缓存，显示推理内容
        if (selectedModel === 'deepseek-reasoner' && cache.reasoning) {
            reasoningDiv.style.display = 'block';
            reasoningContent.textContent = cache.reasoning;
        }
    }

    // 修改模型选择变化的监听器
    document.getElementById('modelSelect').addEventListener('change', async (event) => {
        const newModel = event.target.value;
        const resultDiv = document.getElementById('debugResult');
        const reasoningDiv = document.getElementById('reasoningResult');
        const reasoningContent = document.getElementById('reasoningContent');
        
        // 先清空所有内容
        resultDiv.innerHTML = '';
        reasoningDiv.style.display = 'none';
        reasoningContent.textContent = '';
        
        // 然后检查并加载缓存
        const cache = await loadCache(url, newModel);
        if (cache) {
            resultDiv.innerHTML = marked.parse(cache.content);
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

            // 如果是 deepseek-reasoner 模型且有推理缓存，显示推理内容
            if (newModel === 'deepseek-reasoner' && cache.reasoning) {
                reasoningDiv.style.display = 'block';
                reasoningContent.textContent = cache.reasoning;
            }
        }
    });

    // 添加复制Prompt按钮的事件监听器
    document.getElementById('copyPromptBtn').addEventListener('click', async () => {
        try {
            // 获取当前标签页
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            // 从页面获取内容
            const content = await chrome.tabs.sendMessage(tab.id, {action: "getContent"});
            
            // 构造prompt，与background.js保持一致
            const prompt = `请帮我检查以下LeetCode代码中的问题：

题目描述：
${content.description}

用户代码：
${content.code}

当前测试用例输入：
${content.testResult.input}

测试结果：
状态: ${content.testResult.status}
运行时间: ${content.testResult.runtime}

指令：
1.请指出代码中可能存在的bug和改进建议
2.先用一句话概括问题和解决方法

附加要求：
1. 使用Markdown格式输出`;

            // 复制到剪贴板
            await navigator.clipboard.writeText(prompt);
            
            // 打开DeepSeek Chat
            window.open('https://chat.deepseek.com/', '_blank');
            
        } catch (error) {
            console.error('复制Prompt失败:', error);
        }
    });

    // 添加复制题解Prompt按钮的事件监听器
    document.getElementById('copySolutionPromptBtn').addEventListener('click', async () => {
        try {
            // 获取当前标签页
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            
            // 从页面获取内容
            const content = await chrome.tabs.sendMessage(tab.id, {action: "getContent"});
            
            // 构造题解prompt
            const prompt = `请给出这道LeetCode题目的题解：

题目描述：
${content.description}

请提供：
1. 解题思路分析
2. 最优解代码实现
3. 时间复杂度和空间复杂度分析`;

            // 复制到剪贴板
            await navigator.clipboard.writeText(prompt);
            
            // 打开DeepSeek Chat
            window.open('https://chat.deepseek.com/', '_blank');
            
        } catch (error) {
            console.error('复制题解Prompt失败:', error);
        }
    });
});

document.getElementById('debugBtn').addEventListener('click', async () => {
    console.log('Button clicked');
    const resultDiv = document.getElementById('debugResult');
    const reasoningDiv = document.getElementById('reasoningResult');
    const reasoningContent = document.getElementById('reasoningContent');
    
    resultDiv.innerHTML = "<em>正在等待页面加载...</em>";
    reasoningDiv.style.display = 'none';
    reasoningContent.textContent = '';
    
    let contentBuffer = '';
    let reasoningBuffer = '';
    let lastCacheTime = 0;
    const CACHE_INTERVAL = 200;
    
    const selectedModel = document.getElementById('modelSelect').value;
    
    // 消息监听器设置
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

                // 检查是否需要缓存
                const currentTime = Date.now();
                if (currentTime - lastCacheTime >= CACHE_INTERVAL) {
                    chrome.tabs.query({active: true, currentWindow: true})
                        .then(([tab]) => saveCache(tab.url, selectedModel, {
                            content: contentBuffer,
                            reasoning: reasoningBuffer
                        }))
                        .catch(err => console.error('Failed to save intermediate cache:', err));
                    lastCacheTime = currentTime;
                }
            }
            // 自动滚动到底部
            resultDiv.scrollTop = resultDiv.scrollHeight;
        } else if (message.type === 'streamComplete') {
            // 最终渲染
            resultDiv.innerHTML = marked.parse(contentBuffer);
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
            
            // 最后一次缓存保存
            chrome.tabs.query({active: true, currentWindow: true})
                .then(([tab]) => saveCache(tab.url, selectedModel, {
                    content: contentBuffer,
                    reasoning: reasoningBuffer
                }))
                .then(() => {
                    console.log('Final cache saved successfully');
                    contentBuffer = '';
                    reasoningBuffer = '';
                })
                .catch(err => console.error('Failed to save final cache:', err));
        }
    };

    // 先移除旧的监听器避免重复
    chrome.runtime.onMessage.removeListener(messageListener);
    chrome.runtime.onMessage.addListener(messageListener);

    try {
        // 获取当前标签页
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // 注入并执行内容脚本，确保DOM加载完成
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                return new Promise((resolve) => {
                    if (document.readyState === 'complete') {
                        resolve();
                    } else {
                        window.addEventListener('load', resolve);
                    }
                });
            }
        });

        resultDiv.innerHTML = "<em>正在分析代码...</em>";
        
        // 从页面获取内容
        const content = await chrome.tabs.sendMessage(tab.id, {action: "getContent"});
        console.log(content);

        // 发送到background script处理
        await chrome.runtime.sendMessage({
            action: "debugCode",
            content: content,
            model: selectedModel
        });

    } catch (error) {
        resultDiv.textContent = "错误: " + error.message;
        console.error('Debug error:', error);
    }
});
// 确保在 DOMContentLoaded 事件后注册监听器
document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.onMessage.addListener((message) => {
        console.log('DOMContentLoaded收到消息:', message);
        // ... 其他代码 ...
    });
}); 
