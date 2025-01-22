document.getElementById('debugBtn').addEventListener('click', async () => {
    const resultDiv = document.getElementById('debugResult');
    resultDiv.textContent = "正在分析代码...";

    try {
        // 获取当前标签页
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // 从页面获取内容
        const content = await chrome.tabs.sendMessage(tab.id, {action: "getContent"});
        console.log(content);
        // 发送到background script处理
        const response = await chrome.runtime.sendMessage({
            action: "debugCode",
            content: content
        });

        // 显示结果
        resultDiv.textContent = response.result;
    } catch (error) {
        resultDiv.textContent = "错误: " + error.message;
    }
}); 