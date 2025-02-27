// 游戏配置
export const GAME_CONFIG = {
    // 速度相关
    maxSpeed: 6,              // 提高最大速度上限
    acceleration: 0.08,       // 提高加速度使变化更快
    deceleration: 0.12,       // 保持减速度不变
    runningThreshold: 0.5,    // 降低运动阈值，使其更容易达到运动状态
    bufferSize: 10,          // 减少缓冲区大小以更快地响应变化
    requiredConsecutiveMovements: 8,  // 减少连续运动检测次数要求

    // 速度颜色阈值
    speedColorThresholds: {
        slow: 2.0,            // 低于此值为慢速 (红色)
        medium: 4.0,          // 低于此值为中速 (黄色)，高于为快速 (绿色)
    },
    speedColors: {
        slow: '#B81D13',      // 慢速 - 红色
        medium: '#EFB700',    // 中速 - 黄色
        fast: '#008450',      // 快速 - 绿色
    },

    // 姿势检测
    poseConfidenceThreshold: 0.5,    // 提高姿势检测要求
    calibrationFrames: 20,           // 保持校准帧数要求
    movementThreshold: 2.2,          // 提高运动强度阈值
    stepDetectionThreshold: 0.4,     // 提高步伐检测阈值，确保只有明显的动作才会被计为步伐

    // 新增：近距离检测模式参数
    closeUpDetection: {
        enabled: true,                // 启用近距离检测模式
        upperBodyFocusThreshold: 0.7, // 当上半身可见度高于此值但下半身可见度低于此值时，启用上半身专注模式
        movementThresholdMultiplier: 0.7, // 近距离模式下运动阈值的乘数（降低阈值使检测更灵敏）
        armMovementWeight: 1.5,       // 近距离模式下手臂运动的权重增加
        shoulderDistanceThreshold: 0.3, // 肩膀距离阈值，用于检测用户是否靠近摄像头
    },
    
    // 新增：体重估算参数
    weightEstimation: {
        enabled: true,                 // 启用体重估算
        defaultWeight: 60,             // 默认体重（kg）
        averageShoulderToHeightRatio: 0.25, // 调整肩宽与身高的比例
        heightScaleFactor: 550,        // 新增：身高缩放因子
        averageHeight: {               // 平均身高（cm）
            male: 170,
            female: 160
        },
        defaultGender: 'male',         // 默认性别
        averageBMI: {                  // 平均BMI值
            male: 24,
            female: 23
        },
        shoulderWidthCalibrationFrames: 30,  // 肩宽校准帧数
        minShoulderDistance: 0.1,      // 最小有效肩膀距离
        maxShoulderDistance: 0.9,      // 最大有效肩膀距离
        weightAdjustmentFactor: 0.9    // 体重调整因子
    },

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
    decorationsPerSegment: 50,       // 增加每个地形段的装饰物（树木）数量，从30增加到50
    maxDecorationsPool: 800,         // 增加最大装饰物池大小，从500增加到800

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
    shadowMapSize: 1024,  // 阴影贴图大小
    maxFPS: 60,
    dynamicQuality: true,       // 动态质量调整
    maxDecorations: 400,        // 最大装饰物数量，从200增加到400
    lodDistances: {             // 细节层次距离
        near: 120,              // 从80增加到120
        medium: 180,            // 从120增加到180
        far: 240                // 从160增加到240
    }
};

// 调试设置
export const DEBUG_CONFIG = {
    debug: false,
    showSkeleton: true
};
