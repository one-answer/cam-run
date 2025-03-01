class ShadowRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.initialized = false;
        this.isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        this.SHADOW_OPACITY = this.isMobile ? 0.5 : 0.7;
        this.SHADOW_BLUR = this.isMobile ? 3 : 5;
        this.lastRenderTime = 0;
        this.renderInterval = this.isMobile ? 100 : 50; // 移动端10fps, 桌面端20fps
        this.lowQualityMode = this.isMobile;
        // 设置默认质量 - 电脑端默认使用高质量(2)，移动端使用低质量(0)
        this.SHADOW_QUALITY = this.isMobile ? 0 : 2;
        this.tempLowQuality = false;
        this.previousQuality = this.isMobile ? 0 : 2;
        this.adaptiveQualityEnabled = true;
        this.memoryCheckInterval = 20000; // 增加到20秒检查一次内存
        this.lastMemoryCheck = 0;
        this.devicePerformanceScore = 0; // 设备性能评分
        this.frameTimeHistory = []; // 用于存储帧时间历史
        this.maxFrameTimeHistoryLength = 30; // 最多存储30帧的时间
        this.performanceTestCompleted = false; // 标记性能测试是否已完成
        this.lastAdaptiveCheck = 0; // 上次自适应质量检查的时间
        
        // 内存使用阈值 - 提高阈值，减少频繁切换
        this.highMemoryThreshold = 250; // MB，提高到250MB
        this.lowMemoryThreshold = 180;  // MB，提高到180MB
        
        // 稳定性控制 - 添加计数器防止频繁切换
        this.qualityChangeCounter = 0;
        this.qualityChangeThreshold = 5; // 需要连续5次检测才会改变质量
        this.lastQualityChangeTime = 0;
        this.qualityChangeCooldown = 10000; // 10秒冷却时间

        // 新增：移动端增强阴影配置
        this.mobileShadowEnhanced = true; // 默认启用移动端增强阴影
        this.mobileShadowDetail = 1; // 移动端阴影细节级别 (0-低, 1-中, 2-高)
        this.shadowShapeSmoothing = true; // 启用阴影形状平滑
        this.shadowColorVariation = this.isMobile ? 0.1 : 0.2; // 阴影颜色变化
        this.shadowGroundEffect = this.isMobile; // 启用地面效果
    }

    init() {
        if (this.initialized) return;
        
        // 主画布
        this.canvas = document.getElementById('shadowCanvas');
        if (!this.canvas) {
            console.error('找不到阴影画布元素');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        
        // 移动设备使用更低的分辨率
        const scale = this.isMobile ? 0.5 : 0.75;
        this.canvas.width = 240 * scale; // 降低分辨率
        this.canvas.height = 180 * scale;

        // 离屏画布
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        // 设备性能检测
        this.detectDevicePerformance();
        
        this.initialized = true;
    }

    // 设备性能检测
    detectDevicePerformance() {
        // 如果已经完成性能测试，不再重复测试
        if (this.performanceTestCompleted) return;
        
        // 计算平均帧时间
        let totalFrameTime = 0;
        for (const frameTime of this.frameTimeHistory) {
            totalFrameTime += frameTime;
        }
        const avgFrameTime = totalFrameTime / this.frameTimeHistory.length;
        
        // 根据平均帧时间评估设备性能
        // 帧时间越短，设备性能越好
        if (avgFrameTime < 10) { // 非常好的性能
            this.devicePerformanceScore = 3;
        } else if (avgFrameTime < 16) { // 良好的性能
            this.devicePerformanceScore = 2;
        } else if (avgFrameTime < 30) { // 一般性能
            this.devicePerformanceScore = 1;
        } else { // 较差的性能
            this.devicePerformanceScore = 0;
        }
        
        console.log(`设备性能评分: ${this.devicePerformanceScore}，平均帧时间: ${avgFrameTime.toFixed(2)}ms`);
        
        // 根据性能评分调整阴影质量
        if (this.isMobile) {
            if (this.devicePerformanceScore >= 2) {
                // 高性能移动设备 - 启用增强阴影
                this.SHADOW_QUALITY = 0; // 仍然使用简化阴影
                this.mobileShadowEnhanced = true;
                this.mobileShadowDetail = 1; // 中等细节
                this.shadowGroundEffect = true;
                this.renderInterval = 80; // 提高渲染频率
            } else if (this.devicePerformanceScore >= 1) {
                // 中等性能移动设备 - 简化的增强阴影
                this.SHADOW_QUALITY = 0;
                this.mobileShadowEnhanced = true;
                this.mobileShadowDetail = 0; // 低细节
                this.shadowGroundEffect = false;
                this.renderInterval = 100; // 保持默认渲染频率
            } else {
                // 低性能移动设备 - 禁用增强阴影
                this.SHADOW_QUALITY = 0;
                this.mobileShadowEnhanced = false;
                this.renderInterval = 120; // 降低渲染频率
            }
        } else {
            // 桌面设备根据性能调整阴影质量
            if (this.devicePerformanceScore >= 2) {
                this.SHADOW_QUALITY = 2; // 高质量
            } else if (this.devicePerformanceScore >= 1) {
                this.SHADOW_QUALITY = 1; // 中等质量
            } else {
                this.SHADOW_QUALITY = 0; // 低质量
            }
        }
        
        this.performanceTestCompleted = true;
        this.lastQualityChangeTime = performance.now(); // 设置初始质量变化时间
    }

    clear() {
        if (!this.initialized) return;
        
        // 清除离屏画布
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        
        // 清除主画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    recordFrameTime(frameTime) {
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.maxFrameTimeHistoryLength) {
            this.frameTimeHistory.shift();
        }
    }

    adaptQualityBasedOnPerformance() {
        // 如果未完成初始性能测试，先进行测试
        if (!this.performanceTestCompleted) {
            this.detectDevicePerformance();
            return;
        }
        
        // 检查是否处于冷却期
        const now = performance.now();
        if (now - this.lastQualityChangeTime < this.qualityChangeCooldown) {
            return; // 如果在冷却期内，跳过质量调整
        }
        
        // 检查帧时间历史是否足够
        if (this.frameTimeHistory.length < 15) return;
        
        // 排除异常值，取中间80%的数据计算平均值
        const sortedFrameTimes = [...this.frameTimeHistory].sort((a, b) => a - b);
        const startIndex = Math.floor(sortedFrameTimes.length * 0.1);
        const endIndex = Math.floor(sortedFrameTimes.length * 0.9);
        const filteredFrameTimes = sortedFrameTimes.slice(startIndex, endIndex);
        
        const avgFrameTime = filteredFrameTimes.reduce((a, b) => a + b, 0) / filteredFrameTimes.length;
        
        // 获取内存使用情况
        let memoryUsage = 0;
        if (window.performance && window.performance.memory) {
            memoryUsage = window.performance.memory.usedJSHeapSize / (1024 * 1024); // MB
        }
        
        // 电脑端使用更严格的性能标准
        const frameTimeThreshold = this.isMobile ? 16 : 20; // 电脑端提高到20ms (约50fps)
        
        // 基于性能调整质量
        if (avgFrameTime > frameTimeThreshold || memoryUsage > this.highMemoryThreshold) {
            // 电脑端需要更严重的性能问题才降低质量
            if (!this.isMobile && avgFrameTime < 30) { // 电脑端只有在帧时间超过30ms(约33fps)才考虑降低质量
                this.qualityChangeCounter = 0;
                return;
            }
            
            if (this.SHADOW_QUALITY > 0 && this.qualityChangeCounter < this.qualityChangeThreshold) {
                this.qualityChangeCounter++;
                if (this.qualityChangeCounter >= this.qualityChangeThreshold) {
                    // 电脑端不降低到最低质量
                    const newQuality = Math.max(this.isMobile ? 0 : 1, this.SHADOW_QUALITY - 1);
                    if (newQuality !== this.SHADOW_QUALITY) {
                        this.SHADOW_QUALITY = newQuality;
                        this.lastQualityChangeTime = now;
                        console.log(`性能不佳，降低阴影质量到${this.SHADOW_QUALITY}`);
                    }
                    // 重置历史记录以便评估新设置
                    this.frameTimeHistory = [];
                    this.qualityChangeCounter = 0;
                }
            }
        } else if (avgFrameTime < 8 && memoryUsage < this.lowMemoryThreshold && this.SHADOW_QUALITY < 2) {
            // 性能良好，可以考虑提高质量
            if (this.qualityChangeCounter < this.qualityChangeThreshold) {
                this.qualityChangeCounter++;
                if (this.qualityChangeCounter >= this.qualityChangeThreshold) {
                    // 电脑端可以直接提高到最高质量
                    const newQuality = this.isMobile ? Math.min(1, this.SHADOW_QUALITY + 1) : 2;
                    if (newQuality !== this.SHADOW_QUALITY) {
                        this.SHADOW_QUALITY = newQuality;
                        this.lastQualityChangeTime = now;
                        console.log(`性能良好，提高阴影质量到${this.SHADOW_QUALITY}`);
                    }
                    // 重置历史记录以便评估新设置
                    this.frameTimeHistory = [];
                    this.qualityChangeCounter = 0;
                }
            }
        } else {
            // 性能适中，保持当前质量
            this.qualityChangeCounter = 0;
        }
    }

    render(landmarks) {
        if (!this.initialized || !landmarks) return;
        
        const now = performance.now();
        
        // 根据设置的渲染间隔控制渲染频率
        if (now - this.lastRenderTime < this.renderInterval) return;
        this.lastRenderTime = now;
        
        // 如果启用了自适应质量，并且有足够的帧时间历史数据，检测设备性能
        if (this.adaptiveQualityEnabled && this.frameTimeHistory.length >= 15 && !this.performanceTestCompleted) {
            this.detectDevicePerformance();
        }
        
        // 清除画布
        this.clear();
        
        // 根据质量设置选择渲染方法
        switch (this.SHADOW_QUALITY) {
            case 0: // 最低质量 - 简单圆形
                this.renderUltraSimpleShadow(landmarks);
                break;
            case 1: // 中等质量 - 简化轮廓
                this.renderSimplifiedShadow(landmarks);
                break;
            case 2: // 高质量 - 完整轮廓
                this.renderFullShadow(landmarks);
                break;
            default:
                // 电脑端默认使用高质量
                if (!this.isMobile) {
                    this.renderFullShadow(landmarks);
                } else {
                    this.renderSimplifiedShadow(landmarks);
                }
        }
        
        // 内存使用检查 - 每隔一段时间检查一次
        if (now - this.lastMemoryCheck > this.memoryCheckInterval) {
            this.lastMemoryCheck = now;
            
            // 检查是否处于冷却期
            if (now - this.lastQualityChangeTime < this.qualityChangeCooldown) {
                return; // 如果在冷却期内，跳过内存检查
            }
            
            if (window.performance && window.performance.memory) {
                const memoryUsage = window.performance.memory.usedJSHeapSize / (1024 * 1024); // MB
                
                // 电脑端使用更高的内存阈值
                const highThreshold = this.isMobile ? this.highMemoryThreshold : this.highMemoryThreshold * 1.2;
                const lowThreshold = this.isMobile ? this.lowMemoryThreshold : this.lowMemoryThreshold * 1.2;
                
                // 如果内存使用过高，降低质量
                if (memoryUsage > highThreshold && !this.tempLowQuality) {
                    // 增加计数器，连续多次检测到高内存才降低质量
                    this.qualityChangeCounter++;
                    
                    if (this.qualityChangeCounter >= this.qualityChangeThreshold) {
                        this.tempLowQuality = true;
                        this.previousQuality = this.SHADOW_QUALITY;
                        
                        // 电脑端降低到中等质量，移动端降低到最低质量
                        this.SHADOW_QUALITY = this.isMobile ? 0 : 1;
                        
                        // 如果是移动端，也禁用增强阴影功能
                        if (this.isMobile) {
                            this.mobileShadowDetail = 0;
                            this.shadowGroundEffect = false;
                        }
                        
                        this.lastQualityChangeTime = now;
                        this.qualityChangeCounter = 0;
                        console.log(`内存使用过高 (${memoryUsage.toFixed(2)}MB)，临时降低阴影质量`);
                    }
                } 
                // 如果内存使用恢复正常，恢复之前的质量
                else if (memoryUsage < lowThreshold && this.tempLowQuality) {
                    // 增加计数器，连续多次检测到低内存才恢复质量
                    this.qualityChangeCounter++;
                    
                    if (this.qualityChangeCounter >= this.qualityChangeThreshold) {
                        this.SHADOW_QUALITY = this.previousQuality;
                        this.tempLowQuality = false;
                        
                        // 如果是移动端，恢复增强阴影功能
                        if (this.isMobile) {
                            this.mobileShadowDetail = 1;
                            this.shadowGroundEffect = true;
                        }
                        
                        this.lastQualityChangeTime = now;
                        this.qualityChangeCounter = 0;
                        console.log(`内存使用恢复正常 (${memoryUsage.toFixed(2)}MB)，恢复阴影质量`);
                    }
                } else {
                    // 重置计数器
                    this.qualityChangeCounter = 0;
                }
            }
        }
    }
    
    // 记录帧时间用于性能分析
    recordFrameTime(frameTime) {
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.maxFrameTimeHistoryLength) {
            this.frameTimeHistory.shift();
        }
    }
    
    // 基于性能自适应调整质量
    adaptQualityBasedOnPerformance() {
        if (!this.frameTimeHistory.length) return;
        
        // 计算平均帧时间
        const avgFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
        
        // 获取内存使用情况
        let memoryUsage = 0;
        if (window.performance && window.performance.memory) {
            memoryUsage = window.performance.memory.usedJSHeapSize / (1024 * 1024); // MB
        }
        
        // 基于性能调整质量
        if (avgFrameTime > 16 || memoryUsage > this.highMemoryThreshold) { // 帧时间超过16ms(约60fps)或内存超过200MB
            if (this.SHADOW_QUALITY > 0 && this.qualityChangeCounter < this.qualityChangeThreshold) {
                this.qualityChangeCounter++;
                if (this.qualityChangeCounter >= this.qualityChangeThreshold && performance.now() - this.lastQualityChangeTime > this.qualityChangeCooldown) {
                    this.SHADOW_QUALITY--;
                    this.lastQualityChangeTime = performance.now();
                    console.log(`性能不佳，降低阴影质量到${this.SHADOW_QUALITY}`);
                    // 重置历史记录以便评估新设置
                    this.frameTimeHistory = [];
                    this.qualityChangeCounter = 0;
                }
            }
        } else if (avgFrameTime < 8 && memoryUsage < this.lowMemoryThreshold && this.SHADOW_QUALITY < 2) {
            // 性能良好，可以考虑提高质量
            if (Math.random() < 0.3 && this.qualityChangeCounter < this.qualityChangeThreshold) { // 30%的概率提高质量，避免频繁切换
                this.qualityChangeCounter++;
                if (this.qualityChangeCounter >= this.qualityChangeThreshold && performance.now() - this.lastQualityChangeTime > this.qualityChangeCooldown) {
                    this.SHADOW_QUALITY++;
                    this.lastQualityChangeTime = performance.now();
                    console.log(`性能良好，提高阴影质量到${this.SHADOW_QUALITY}`);
                    // 重置历史记录以便评估新设置
                    this.frameTimeHistory = [];
                    this.qualityChangeCounter = 0;
                }
            }
        }
    }
    
    // 超简化的阴影绘制 - 用于最低质量模式
    renderUltraSimpleShadow(landmarks) {
        // 找到关键点的边界
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        
        for (const lm of landmarks) {
            if (!lm) continue;
            minX = Math.min(minX, lm.x);
            maxX = Math.max(maxX, lm.x);
            minY = Math.min(minY, lm.y);
            maxY = Math.max(maxY, lm.y);
        }
        
        // 如果没有足够的关键点，返回
        if (minX === 1 || maxX === 0 || minY === 1 || maxY === 0) return;
        
        // 计算中心点和尺寸
        const centerX = (minX + maxX) / 2 * this.offscreenCanvas.width;
        const centerY = (minY + maxY) / 2 * this.offscreenCanvas.height;
        
        // 计算阴影尺寸 - 根据人物高度和宽度调整
        const width = (maxX - minX) * this.offscreenCanvas.width * 0.15;
        const height = (maxY - minY) * this.offscreenCanvas.height * 0.1;
        
        // 清除画布
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        
        // 如果启用了移动端增强阴影并且是移动设备
        if (this.isMobile && this.mobileShadowEnhanced) {
            // 获取脚部位置以更好地定位阴影
            const leftFoot = landmarks[31];
            const rightFoot = landmarks[32];
            let footY = centerY;
            
            // 如果有脚部关键点，使用它们来定位阴影
            if (leftFoot && rightFoot) {
                footY = Math.max(leftFoot.y, rightFoot.y) * this.offscreenCanvas.height;
            }
            
            // 根据细节级别绘制不同质量的阴影
            if (this.mobileShadowDetail >= 1) {
                // 中等细节 - 椭圆阴影带渐变
                const gradient = this.offscreenCtx.createRadialGradient(
                    centerX, footY, 0,
                    centerX, footY, width * 1.5
                );
                gradient.addColorStop(0, `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`);
                gradient.addColorStop(0.7, `rgba(0, 0, 0, ${this.SHADOW_OPACITY * 0.7})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                // 绘制椭圆阴影
                this.offscreenCtx.beginPath();
                this.offscreenCtx.ellipse(centerX, footY, width * 1.2, height * 1.5, 0, 0, Math.PI * 2);
                this.offscreenCtx.fillStyle = gradient;
                this.offscreenCtx.fill();
                
                // 如果启用了地面效果，添加一个扁平的椭圆作为地面反射
                if (this.shadowGroundEffect) {
                    this.offscreenCtx.beginPath();
                    this.offscreenCtx.ellipse(centerX, footY + height * 0.2, width * 1.5, height * 0.8, 0, 0, Math.PI * 2);
                    this.offscreenCtx.fillStyle = `rgba(0, 0, 0, ${this.SHADOW_OPACITY * 0.3})`;
                    this.offscreenCtx.fill();
                }
            } else {
                // 低细节 - 简单椭圆
                this.offscreenCtx.beginPath();
                this.offscreenCtx.ellipse(centerX, footY, width * 1.2, height, 0, 0, Math.PI * 2);
                this.offscreenCtx.fillStyle = `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`;
                this.offscreenCtx.fill();
            }
        } else {
            // 原始的超简化阴影
            this.offscreenCtx.beginPath();
            this.offscreenCtx.ellipse(centerX, centerY + height * 0.5, width, height, 0, 0, Math.PI * 2);
            this.offscreenCtx.fillStyle = `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`;
            this.offscreenCtx.fill();
        }
        
        // 将离屏画布内容绘制到主画布
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.restore();
    }

    renderSimplifiedShadow(landmarks) {
        // 清除画布
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        
        // 找到关键点的边界
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        
        for (const lm of landmarks) {
            if (!lm) continue;
            minX = Math.min(minX, lm.x);
            maxX = Math.max(maxX, lm.x);
            minY = Math.min(minY, lm.y);
            maxY = Math.max(maxY, lm.y);
        }
        
        // 如果没有足够的关键点，返回
        if (minX === 1 || maxX === 0 || minY === 1 || maxY === 0) return;
        
        // 计算中心点和尺寸
        const centerX = (minX + maxX) / 2 * this.offscreenCanvas.width;
        const centerY = (maxY - (maxY - minY) * 0.1) * this.offscreenCanvas.height; // 向下偏移一点
        
        // 减小阴影尺寸
        const width = (maxX - minX) * this.offscreenCanvas.width * 1.0;
        const height = (maxY - minY) * this.offscreenCanvas.height * 0.6;
        
        // 创建径向渐变
        const gradient = this.offscreenCtx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, width
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        // 绘制椭圆阴影
        this.offscreenCtx.beginPath();
        this.offscreenCtx.ellipse(centerX, centerY, width, height, 0, 0, Math.PI * 2);
        this.offscreenCtx.fillStyle = gradient;
        this.offscreenCtx.fill();
        
        // 将离屏画布内容绘制到主画布
        this.ctx.save();
        this.ctx.globalAlpha = 0.5;
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.restore();
    }

    renderFullShadow(landmarks) {
        // 绘制身体各部分
        this.drawTorso(this.offscreenCtx, landmarks);  // 躯干
        this.drawLimbs(this.offscreenCtx, landmarks);  // 四肢
        this.drawHead(this.offscreenCtx, landmarks);   // 头部
        
        // 将离屏画布内容绘制到主画布
        this.ctx.save();
        this.ctx.globalAlpha = 0.7;
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.restore();
    }

    drawTorso(ctx, landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

        // 计算躯干中心点
        const centerX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4 * ctx.canvas.width;
        
        // 向上调整躯干阴影位置，减少与头部的空隙
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2 * ctx.canvas.height;
        const hipY = (leftHip.y + rightHip.y) / 2 * ctx.canvas.height;
        // 稍微向肩膀方向偏移中心点，减少与腿部的空隙
        const centerY = shoulderY + (hipY - shoulderY) * 0.4;
        
        // 计算躯干尺寸 - 减小尺寸
        const torsoWidth = Math.abs(leftShoulder.x - rightShoulder.x) * ctx.canvas.width;
        const torsoHeight = Math.abs(leftShoulder.y - leftHip.y) * ctx.canvas.height;
        const radius = Math.max(torsoWidth, torsoHeight) / 2.8;

        // 创建径向渐变
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // 绘制躯干椭圆
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radius* 0.6, radius , 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    drawLimbs(ctx, landmarks) {
        // 绘制手臂
        this.drawLimb(ctx, landmarks[11], landmarks[13], landmarks[15]); // 左臂
        this.drawLimb(ctx, landmarks[12], landmarks[14], landmarks[16]); // 右臂

        // 绘制腿部
        this.drawLimb(ctx, landmarks[23], landmarks[25], landmarks[27]); // 左腿
        this.drawLimb(ctx, landmarks[24], landmarks[26], landmarks[28]); // 右腿
    }

    drawLimb(ctx, start, mid, end) {
        if (!start || !mid || !end) return;

        // 转换坐标
        const points = [start, mid, end].map(p => ({
            x: p.x * ctx.canvas.width,
            y: p.y * ctx.canvas.height
        }));

        // 缩短手臂长度 - 向中心点缩短20%
        const shortenEndPoint = (point, referencePoint, shortenFactor = 0.2) => {
            return {
                x: point.x + (referencePoint.x - point.x) * shortenFactor,
                y: point.y + (referencePoint.y - point.y) * shortenFactor
            };
        };
        
        // 缩短起点和终点
        points[0] = shortenEndPoint(points[0], points[1]);
        points[2] = shortenEndPoint(points[2], points[1]);

        // 创建渐变
        const gradient = ctx.createLinearGradient(
            points[0].x, points[0].y,
            points[2].x, points[2].y
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${this.SHADOW_OPACITY * 0.5})`);

        // 绘制连接线
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        // 使用二次贝塞尔曲线创建平滑的连接
        const cp1x = (points[0].x + points[1].x) / 2;
        const cp1y = (points[0].y + points[1].y) / 2;
        const cp2x = (points[1].x + points[2].x) / 2;
        const cp2y = (points[1].y + points[2].y) / 2;

        ctx.quadraticCurveTo(points[1].x, points[1].y, cp2x, cp2y);
        ctx.lineTo(points[2].x, points[2].y);

        // 设置线条样式
        ctx.lineWidth = 10;  // 减小线条宽度
        ctx.lineCap = 'round';
        ctx.strokeStyle = gradient;
        ctx.stroke();

        // 在关节处添加圆形，但不在肘部(中间点)添加明显的圆形
        ctx.fillStyle = `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`;
        
        // 起点和终点的圆形
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(points[2].x, points[2].y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 中间点的小圆形
        ctx.beginPath();
        ctx.arc(points[1].x, points[1].y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHead(ctx, landmarks) {
        const nose = landmarks[0];
        const leftEye = landmarks[2];
        const rightEye = landmarks[5];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        if (!nose || !leftEye || !rightEye) return;

        // 计算头部大小
        const eyeDistance = Math.sqrt(
            Math.pow((rightEye.x - leftEye.x) * ctx.canvas.width, 2) +
            Math.pow((rightEye.y - leftEye.y) * ctx.canvas.height, 2)
        );
        
        // 增大头部阴影半径，减少与躯干的空隙
        const headRadius = eyeDistance * 1.5;
        
        // 创建径向渐变
        const centerX = nose.x * ctx.canvas.width;
        
        // 如果有肩膀关键点，稍微向下调整头部阴影位置，减少与躯干的空隙
        let centerY = nose.y * ctx.canvas.height;
        if (leftShoulder && rightShoulder) {
            const shoulderY = (leftShoulder.y + rightShoulder.y) / 2 * ctx.canvas.height;
            const neckLength = shoulderY - centerY;
            // 向下移动头部阴影中心点，减少颈部空隙
            centerY += neckLength * 0.15;
        }
        
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, headRadius
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        // 绘制头部阴影
        ctx.beginPath();
        ctx.arc(centerX, centerY, headRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

export const shadowRenderer = new ShadowRenderer();

// 将阴影渲染器暴露给全局对象以便性能控制
window.shadowRenderer = shadowRenderer;

// 全局变量，用于跟踪步数和运动状态
let stepCount = 0;
let lastStepTime = 0;
let isRunning = false;
let consecutiveMovements = 0;
let speedBuffer = [];
let armSwingPhase = 'neutral'; // 'up', 'down', 'neutral'
let armCycleProgress = 0; // 0-100
let lastArmPositions = {}; // 存储上一次手臂位置
let previousCompleteCycleTime = null; // 上一次完整周期的时间
let lastCompleteCycleTime = null; // 最近一次完整周期的时间
let cyclesPerMinute = 0; // 每分钟周期数
let lastStepCycleCount = 0; // 上次增加步数时的周期计数
let totalCycleCount = 0; // 总周期计数
let stepLockoutActive = false; // 步数锁定状态
let stepLockoutEndTime = 0; // 步数锁定结束时间
