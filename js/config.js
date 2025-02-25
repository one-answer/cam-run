// 游戏配置
export const GAME_CONFIG = {
    // 速度相关
    maxSpeed: 8,
    acceleration: 0.2,
    deceleration: 0.15,
    runningThreshold: 0.2,     // 调整运动阈值
    bufferSize: 3,
    requiredConsecutiveMovements: 2,

    // 地形系统
    terrainSegmentLength: 1000,
    terrainWidth: 100,
    activeTerrainSegments: 5,
    decorationsPerSegment: 15,
    maxDecorationsPool: 300,

    // 姿势检测
    poseConfidenceThreshold: 0.25,
    calibrationFrames: 15,
    movementThreshold: 1.5,    // 降低速度阈值以适应新的检测逻辑
    stepDetectionThreshold: 0.15,

    // 渲染设置
    shadowMapSize: 2048,
    maxFPS: 60,
    
    // 调试设置
    debug: false,
    showSkeleton: true
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
