// 获取题目描述和用户代码
function getLeetCodeContent() {
    // 获取题目描述
    const problemDescription = document.querySelector('[data-track-load="description_content"]')?.textContent || '';
    
    // 获取代码编辑器内容
    let userCode = '';
    const codeLines = document.querySelectorAll('.view-lines .view-line');
    if (codeLines.length > 0) {
        userCode = Array.from(codeLines)
            .map(line => {
                // 获取行内所有文本内容并保留空格
                return line.textContent;
            })
            .join('\n');
    }

    // 如果上面的方法失败，尝试其他方法获取代码
    if (!userCode) {
        const monacoEditor = document.querySelector('.monaco-editor');
        if (monacoEditor) {
            const model = monacoEditor.__proto__.getValue?.();
            if (model) {
                userCode = model;
            }
        }
    }

    console.log(problemDescription);
    console.log(userCode);
    
    return {
        description: problemDescription.trim(),
        code: userCode.trim()
    };
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContent") {
        const content = getLeetCodeContent();
        console.log('Extracted content:', content); // 添加调试日志
        sendResponse(content);
    }
}); 