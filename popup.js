console.log('Popup script loaded');  // 检查脚本是否加载

document.getElementById('debugBtn').addEventListener('click', async () => {
    console.log('Button clicked');   // 检查按钮点击事件
    const resultDiv = document.getElementById('debugResult');
    resultDiv.textContent = "正在分析代码...";
    console.log("正在分析代码...");
    try {
        // 获取当前标签页
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // 从页面获取内容
        const content = await chrome.tabs.sendMessage(tab.id, {action: "getContent"});
        console.log(content);

        // 监听流式内容
        chrome.runtime.onMessage.addListener((message) => {
            console.log('收到消息:', message);  // 检查是否收到消息
            
            if (message.type === 'streamContent') {
                console.log('收到流式内容:', message.content);  // 检查内容
                // 追加新内容
                if (resultDiv.textContent === "正在分析代码...") {
                    resultDiv.textContent = message.content;
                } else {
                    resultDiv.textContent += message.content;
                }
            } else if (message.type === 'streamComplete') {
                console.log('流完成');
            }
        });

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