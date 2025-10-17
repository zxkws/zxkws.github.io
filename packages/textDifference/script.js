// 引用 diff-match-patch 库
const dmp = new diff_match_patch();

document.getElementById("compareBtn").addEventListener("click", () => {
    const text1 = document.getElementById("text1").value;
    const text2 = document.getElementById("text2").value;

    // 使用 diff-match-patch 库生成差异
    const diff = dmp.diff_main(text1, text2);

    // 对差异结果进行处理，生成 HTML
    dmp.diff_cleanupSemantic(diff);
    const diffHtml = diff.map(part => {
        const type = part[0];
        const text = part[1];

        if (type === 1) { // 新增的部分
            return `<span class="bg-green-200">${text}</span>`;
        } else if (type === -1) { // 删除的部分
            return `<span class="bg-red-200 line-through">${text}</span>`;
        } else { // 未改变的部分
            return `<span>${text}</span>`;
        }
    }).join('');

    // 显示在页面上
    document.getElementById("diffOutput").innerHTML = diffHtml;
});
