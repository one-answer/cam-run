// 游戏配置
export const GAME_CONFIG = {
    // 速度相关
    maxSpeed: 6,              // 提高最大速度上限
    acceleration: 0.08,       // 提高加速度使变化更快
    deceleration: 0.12,       // 保持减速度不变
    runningThreshold: 0.5,    // 降低运动阈值，使其更容易达到运动状态
    bufferSize: 10,          // 减少缓冲区大小以更快地响应变化
    requiredConsecutiveMovements: 8,  // 减少连续运动检测次数要求

    // 姿势检测
    poseConfidenceThreshold: 0.5,    // 提高姿势检测要求
    calibrationFrames: 20,           // 保持校准帧数要求
    movementThreshold: 2.2,          // 提高运动强度阈值
    stepDetectionThreshold: 0.4,     // 提高步伐检测阈值，确保只有明显的动作才会被计为步伐

    // 运动评估参数
    motionEvaluation: {
        frequencyWeight: 0.7,         // 进一步增加频率权重
        amplitudeWeight: 0.3,         // 进一步降低幅度权重
        nonLinearScaling: 2.5,        // 增加非线性映射使变化更陡峭
        minQualityThreshold: 0.8,     // 提高姿势质量要求
        speedChangeLimit: 0.08,       // 进一步降低速度变化限制
        posturePenalty: 0.8,         // 增加姿势惩罚
        speedRampUpFactor: 0.4,      // 进一步降低速度增长因子
        initialSpeedPenalty: 0.5     // 增加初始速度惩罚
    },

    // 地形系统
    terrainSegmentLength: 1000,
    terrainWidth: 100,
    activeTerrainSegments: 5,
    decorationsPerSegment: 15,
    maxDecorationsPool: 300,

    // 步伐检测相关参数
    minStepInterval: 150,            // 进一步减少最小步伐间隔（毫秒），使步数增长更快
    armPhaseThreshold: 0.05,         // 保持手臂相位变化阈值不变
};

// 骨骼渲染配置
export const SKELETON_CONFIG = {
    color: '#00ff00',
    lineWidth: 2,
    radius: 4,
    connections: [
        // 躯干
        [11, 12], // 肩膀
        [11, 23], // 左躯干
        [12, 24], // 右躯干
        [23, 24], // 臀部
        
        // 左腿
        [23, 25], // 左大腿
        [25, 27], // 左小腿
        [27, 31], // 左脚
        
        // 右腿
        [24, 26], // 右大腿
        [26, 28], // 右小腿
        [28, 32]  // 右脚
    ]
};

// 渲染设置
export const RENDER_CONFIG = {
    shadowMapSize: 2048,
    maxFPS: 60,
};

// 调试设置
export const DEBUG_CONFIG = {
    debug: false,
    showSkeleton: true
};
