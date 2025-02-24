// 游戏配置
export const GAME_CONFIG = {
    // 速度相关
    maxSpeed: 5,
    acceleration: 0.1,
    deceleration: 0.05,
    runningThreshold: 0.2,
    bufferSize: 5,
    requiredConsecutiveMovements: 3,

    // 地形系统
    terrainSegmentLength: 1000,
    terrainWidth: 100,
    activeTerrainSegments: 5,
    decorationsPerSegment: 15,
    maxDecorationsPool: 300,

    // 姿势检测
    poseConfidenceThreshold: 0.3,
    calibrationFrames: 30,
    movementThreshold: 0.1,
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
