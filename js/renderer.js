import { SKELETON_CONFIG, RENDER_CONFIG, GAME_CONFIG } from './config.js';
import { shadowRenderer } from './shadowRenderer.js';

class Renderer {
    constructor() {
        this.skeletonCanvas = null;
        this.skeletonCtx = null;
        this.initialized = false;
        this.isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.frameTimes = [];
        this.lastFrameTime = performance.now();
        this.memoryUsage = {
            jsHeapSizeLimit: 0,
            totalJSHeapSize: 0,
            usedJSHeapSize: 0
        };
        this.fps = 0;
        this.memory = 0;
        this.lastMemoryCheck = 0;
        this.debugElement = null;
        
        // 电池状态监控
        this.batteryLevel = 1.0; // 默认满电
        this.isCharging = true;  // 默认充电中
        this.lowBatteryMode = false;
        this.batteryCheckInterval = 60000; // 每分钟检查一次电池
        this.lastBatteryCheck = 0;
        this.initBatteryMonitoring();
        
        // 不活动检测
        this.lastActivityTime = performance.now();
        this.isInactive = false;
        this.inactivityThreshold = GAME_CONFIG.mobileOptimization.inactivityTimeout || 30000; // 默认30秒
    }

    init() {
        if (this.initialized) return;

        this.initSkeletonCanvas();
        shadowRenderer.init();
        this.addTouchListeners();
        
        // 初始化调试元素
        this.debugElement = document.getElementById('debug');
        
        this.initialized = true;
    }

    initSkeletonCanvas() {
        this.skeletonCanvas = document.getElementById('skeletonCanvas');
        if (!this.skeletonCanvas) {
            console.error('找不到骨骼画布元素');
            return;
        }
        this.skeletonCtx = this.skeletonCanvas.getContext('2d');
        const width = this.isMobile ? window.innerWidth * 0.8 : 320;
        const height = this.isMobile ? width * 0.75 : 240;
        this.skeletonCanvas.width = width;
        this.skeletonCanvas.height = height;
    }

    addTouchListeners() {
        if (!this.skeletonCanvas) return;

        this.skeletonCanvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.skeletonCanvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    }

    handleTouchStart(event) {
        // 更新活动时间戳
        this.lastActivityTime = performance.now();
        
        // 如果处于不活动状态，则恢复正常模式
        if (this.isInactive) {
            this.isInactive = false;
            console.log('检测到触摸，恢复正常模式');
            
            // 恢复阴影渲染频率
            if (typeof shadowRenderer !== 'undefined' && shadowRenderer) {
                shadowRenderer.renderInterval = this.isMobile ? 100 : 50;
            }
            
            // 恢复FPS上限
            if (typeof RENDER_CONFIG !== 'undefined' && RENDER_CONFIG && RENDER_CONFIG.mobile) {
                RENDER_CONFIG.mobile.maxFPS = 30;
            }
        }
        
        if (event.touches.length > 0) {
            this.touchStartX = event.touches[0].clientX;
            this.touchStartY = event.touches[0].clientY;
        }
    }

    handleTouchEnd(event) {
        // 更新活动时间戳
        this.lastActivityTime = performance.now();
        
        if (event.changedTouches.length > 0) {
            this.touchEndX = event.changedTouches[0].clientX;
            this.touchEndY = event.changedTouches[0].clientY;
            this.handleGesture();
        }
    }

    handleGesture() {
        const dx = this.touchEndX - this.touchStartX;
        const dy = this.touchEndY - this.touchStartY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 50) { // 最小滑动距离
            if (Math.abs(dx) > Math.abs(dy)) {
                // 水平滑动
                if (dx > 0) {
                    this.onSwipeRight();
                } else {
                    this.onSwipeLeft();
                }
            } else {
                // 垂直滑动
                if (dy > 0) {
                    this.onSwipeDown();
                } else {
                    this.onSwipeUp();
                }
            }
        }
    }

    onSwipeRight() {
        const speed = Math.min(GAME_CONFIG.maxSpeed, GAME_CONFIG.maxSpeed + 0.5);
        GAME_CONFIG.maxSpeed = speed;
        console.log(`速度增加到: ${speed.toFixed(1)} m/s`);
        console.log('Swipe right');
    }

    onSwipeLeft() {
        const speed = Math.max(1, GAME_CONFIG.maxSpeed - 0.5);
        GAME_CONFIG.maxSpeed = speed;
        console.log(`速度降低到: ${speed.toFixed(1)} m/s`);
        console.log('Swipe left');
    }

    onSwipeDown() {
        shadowRenderer.SHADOW_QUALITY = (shadowRenderer.SHADOW_QUALITY + 1) % 3;
        const quality = ['低', '中', '高'][shadowRenderer.SHADOW_QUALITY];
        console.log(`阴影质量调整为: ${quality}`);
        console.log('Swipe down');
    }

    onSwipeUp() {
        const debugInfo = document.getElementById('debug');
        if (debugInfo) {
            debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
            console.log(`调试信息${debugInfo.style.display === 'none' ? '隐藏' : '显示'}`);
        }
        console.log('Swipe up');
    }

    clearCanvas(ctx) {
        if (!ctx || !ctx.canvas) return;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    updatePerformanceMetrics() {
        const now = performance.now();
        
        // 计算帧率
        if (this.lastFrameTime) {
            const frameTime = now - this.lastFrameTime;
            this.frameTimes.push(frameTime);
            
            // 限制帧时间数组大小
            if (this.frameTimes.length > 30) {
                this.frameTimes.shift();
            }
            
            // 计算平均帧率 - 使用更长的时间窗口计算平均值
            if (this.frameTimes.length >= 10) {
                const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
                this.fps = Math.round(1000 / avgFrameTime);
                
                // 更新shadowRenderer的帧时间历史
                if (typeof shadowRenderer !== 'undefined' && shadowRenderer) {
                    shadowRenderer.frameTimeHistory.push(frameTime);
                    if (shadowRenderer.frameTimeHistory.length > shadowRenderer.maxFrameTimeHistoryLength) {
                        shadowRenderer.frameTimeHistory.shift();
                    }
                    
                    // 加快性能检测 - 只在足够帧数和性能测试未完成时进行检测
                    if (shadowRenderer.frameTimeHistory.length >= 15 && !shadowRenderer.performanceTestCompleted) {
                        shadowRenderer.detectDevicePerformance();
                    }
                    
                    // 减少质量调整的频率 - 只有每20秒才检查一次
                    if (shadowRenderer.performanceTestCompleted && now - shadowRenderer.lastAdaptiveCheck > 20000) {
                        shadowRenderer.lastAdaptiveCheck = now;
                        shadowRenderer.adaptQualityBasedOnPerformance();
                    }
                    
                    // 电脑端保持高质量阴影的逻辑 - 添加冷却时间和计数器
                    if (!this.isMobile && this.fps > 40 && shadowRenderer.SHADOW_QUALITY < 2 && shadowRenderer.performanceTestCompleted) {
                        // 只有当距离上次质量变化超过10秒时才考虑提高质量
                        if (now - shadowRenderer.lastQualityChangeTime > shadowRenderer.qualityChangeCooldown) {
                            shadowRenderer.qualityChangeCounter++;
                            // 需要连续多次检测到高帧率才提高质量
                            if (shadowRenderer.qualityChangeCounter >= 3) {
                                shadowRenderer.SHADOW_QUALITY = 2;
                                shadowRenderer.lastQualityChangeTime = now;
                                shadowRenderer.qualityChangeCounter = 0;
                                console.log('电脑端恢复高质量阴影');
                            }
                        }
                    } else {
                        // 重置计数器
                        shadowRenderer.qualityChangeCounter = 0;
                    }
                }
            }
        }
        
        this.lastFrameTime = now;
        
        // 获取内存使用情况 (每2秒更新一次，减少频繁检查)
        if (now - this.lastMemoryCheck > 2000) {
            this.lastMemoryCheck = now;
            if (performance.memory) {
                const newMemory = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
                // 使用平滑过渡而不是突变
                this.memory = this.memory ? (this.memory * 0.7 + newMemory * 0.3) : newMemory;
            }
        }
        
        // 检查不活动状态
        this.checkInactivity(now);
        
        // 检查电池状态
        this.checkBatteryStatus();
        
        // 更新调试信息
        if (this.debugElement) {
            this.debugElement.textContent = `FPS: ${this.fps} | 内存: ${Math.round(this.memory)}MB | 电池: ${Math.round(this.batteryLevel * 100)}% ${this.isCharging ? '(充电中)' : ''} | ${this.isInactive ? '不活动' : '活动中'} | 阴影质量: ${shadowRenderer ? shadowRenderer.SHADOW_QUALITY : 'N/A'}`;
        }
    }

    updateShadow(video, results) {
        if (!results || !results.poseLandmarks) return;
        
        // 确保shadowRenderer已初始化
        if (typeof shadowRenderer === 'undefined' || !shadowRenderer) {
            console.error('shadowRenderer未定义');
            return;
        }
        
        // 性能优化：根据FPS动态调整阴影渲染频率
        if (this.fps > 0 && this.fps < 30 && this.isMobile) {
            // 当FPS低于30时，降低阴影渲染频率
            if (Math.random() > 0.7) { // 只有30%的帧会渲染阴影
                shadowRenderer.render(results.poseLandmarks);
            }
        } else {
            shadowRenderer.render(results.poseLandmarks);
        }
        
        // 性能优化：当内存使用过高时，临时降低阴影质量
        if (this.memory > 150 && this.isMobile) { // 超过150MB时
            if (!shadowRenderer.tempLowQuality) {
                shadowRenderer.tempLowQuality = true;
                shadowRenderer.previousQuality = shadowRenderer.SHADOW_QUALITY;
                shadowRenderer.SHADOW_QUALITY = 0; // 设置为最低质量
                console.log('内存使用过高，临时降低阴影质量');
            }
        } else if (shadowRenderer.tempLowQuality) {
            // 恢复之前的质量设置
            shadowRenderer.SHADOW_QUALITY = shadowRenderer.previousQuality;
            shadowRenderer.tempLowQuality = false;
            console.log('内存使用恢复，恢复阴影质量');
        }
        
        this.updatePerformanceMetrics();
    }

    initBatteryMonitoring() {
        // 只在移动设备上监控电池
        if (!this.isMobile) return;
        
        // 检查浏览器是否支持电池API
        if (navigator.getBattery) {
            try {
                navigator.getBattery().then(battery => {
                    this.batteryLevel = battery.level;
                    this.isCharging = battery.charging;
                    this.checkBatteryStatus();
                    
                    // 添加事件监听器
                    battery.addEventListener('levelchange', () => {
                        this.batteryLevel = battery.level;
                        this.isCharging = battery.charging;
                        this.checkBatteryStatus();
                    });
                    
                    battery.addEventListener('chargingchange', () => {
                        this.batteryLevel = battery.level;
                        this.isCharging = battery.charging;
                        this.checkBatteryStatus();
                    });
                }).catch(error => {
                    console.log('电池API访问失败:', error);
                });
            } catch (error) {
                console.log('电池API初始化失败:', error);
            }
        } else {
            console.log('此浏览器不支持电池状态API');
        }
    }

    checkBatteryStatus() {
        const now = performance.now();
        // 只在移动设备上检查电池状态
        if (!this.isMobile) return;
        
        if (now - this.lastBatteryCheck > this.batteryCheckInterval) {
            this.lastBatteryCheck = now;
            if (this.batteryLevel < 0.2 && !this.isCharging) {
                this.lowBatteryMode = true;
                console.log('低电量模式启用');
            } else {
                this.lowBatteryMode = false;
                console.log('低电量模式禁用');
            }
        }
    }

    checkInactivity(now) {
        // 检查是否超过不活动阈值
        if (now - this.lastActivityTime > this.inactivityThreshold) {
            if (!this.isInactive) {
                this.isInactive = true;
                console.log('检测到不活动，启用省电模式');
                
                // 降低阴影渲染频率
                if (typeof shadowRenderer !== 'undefined' && shadowRenderer) {
                    shadowRenderer.renderInterval = shadowRenderer.renderInterval * 2;
                }
                
                // 如果在移动设备上，进一步降低性能消耗
                if (this.isMobile) {
                    // 降低FPS上限
                    if (typeof RENDER_CONFIG !== 'undefined' && RENDER_CONFIG && 
                        RENDER_CONFIG.mobile && RENDER_CONFIG.mobile.batterySaving) {
                        RENDER_CONFIG.mobile.maxFPS = RENDER_CONFIG.mobile.batterySaving.inactiveMaxFPS;
                    }
                }
            }
        } else if (this.isInactive) {
            // 恢复正常模式
            this.isInactive = false;
            console.log('检测到活动，恢复正常模式');
            
            // 恢复阴影渲染频率
            if (typeof shadowRenderer !== 'undefined' && shadowRenderer) {
                shadowRenderer.renderInterval = this.isMobile ? 100 : 50;
            }
            
            // 恢复FPS上限
            if (typeof RENDER_CONFIG !== 'undefined' && RENDER_CONFIG && RENDER_CONFIG.mobile) {
                RENDER_CONFIG.mobile.maxFPS = 30;
            }
        }
        
        // 调试输出当前活动状态
        if (this.isInactive) {
            console.log(`不活动状态：已持续 ${Math.round((now - this.lastActivityTime) / 1000)} 秒`);
        }
    }
}

export const renderer = new Renderer();
