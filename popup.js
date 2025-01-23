// 在文件顶部添加配置
marked.setOptions({
    breaks: true,
    highlight: function(code) {
        return hljs.highlightAuto(code).value;
    }
});

console.log('Popup script loaded');  // 检查脚本是否加载

document.getElementById('debugBtn').addEventListener('click', async () => {
    console.log('Button clicked');   // 检查按钮点击事件
    const resultDiv = document.getElementById('debugResult');
    resultDiv.innerHTML = "<em>正在分析代码...</em>"; // 改为使用HTML
    let buffer = ''; // 新增缓冲区
    
    // 消息监听器
    const messageListener = (message) => {
        if (message.type === 'streamContent') {
            buffer += message.content;
            // 直接渲染
            resultDiv.innerHTML = marked.parse(buffer);
            // 自动滚动到底部
            resultDiv.scrollTop = resultDiv.scrollHeight;
        } else if (message.type === 'streamComplete') {
            // 最终渲染一次确保完整性
            resultDiv.innerHTML = marked.parse(buffer);
            buffer = '';
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

        // 发送到background script处理
        await chrome.runtime.sendMessage({
            action: "debugCode",
            content: content
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