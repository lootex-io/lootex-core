function calculateTraitRarities(tokens) {
    const traitCounts = {};
    const totalTokens = tokens.length;

    // 统计每个特征的出现次数
    tokens.forEach(token => {
        token.traits.forEach(trait => {
            const key = `${trait.type}:${trait.value}`;
            traitCounts[key] = (traitCounts[key] || 0) + 1;
        });
    });

    // 计算每个特征的稀有度分数
    const traitScores = {};
    Object.entries(traitCounts).forEach(([key, count]) => {
        traitScores[key] = 1 / (count / totalTokens);
    });

    return traitScores;
}

function scoreCollection(tokens) {
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        console.error('Invalid tokens input');
        return [];
    }

    const traitScores = calculateTraitRarities(tokens);

    // 计算每个代币的总分
    const scores = tokens.map(token => {
        let totalScore = 0;
        
        // 如果代币没有特征，给予基础分数
        if (!token.traits || token.traits.length === 0) {
            totalScore = 1;
        } else {
            // 累加所有特征的稀有度分数
            token.traits.forEach(trait => {
                const key = `${trait.type}:${trait.value}`;
                totalScore += traitScores[key] || 0;
            });
        }

        return {
            tokenID: token.tokenID,
            score: totalScore
        };
    });

    // 排序并添加排名
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((score, index) => {
        score.rank = index + 1;
    });

    return scores;
}

module.exports = {
    scoreCollection
}; 