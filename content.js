// 获取题目描述和用户代码
function getLeetCodeContent() {
    // 获取题目描述
    const problemDescription = document.querySelector('[data-track-load="description_content"]')?.textContent || '';
    
    // 获取代码编辑器内容
    let userCode = '';
    const codeLines = document.querySelectorAll('.view-lines .view-line');
    if (codeLines.length > 0) {
        userCode = Array.from(codeLines)
            .map(line => line.textContent)
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

    // 获取测试用例和结果
    const testInput = document.querySelector('[data-e2e-locator="console-testcase-input"]')?.textContent || '';
    const testResult = document.querySelector('[data-e2e-locator="console-result"]')?.textContent || '';
    const testRuntime = document.querySelector('.text-label-3')?.textContent || '';

    const result = {
        description: problemDescription.trim(),
        code: userCode.trim(),
        testResult: {
            input: testInput.trim(),
            status: testResult.trim(),
            runtime: testRuntime.trim(),
        }
    };

    // 添加详细的调试日志
    console.log('=== LeetCode Content Debug Log ===');
    console.log('Description:', result.description);
    console.log('Code:', result.code);
    console.log('Test Input:', result.testResult.input);
    console.log('Test Result Status:', result.testResult.status);
    console.log('Test Runtime:', result.testResult.runtime);
    console.log('================================');

    return result;
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContent") {
        const content = getLeetCodeContent();
        // 保留现有的调试日志
        console.log('Extracted content:', JSON.stringify(content, null, 2));
        sendResponse(content);
    }
}); 