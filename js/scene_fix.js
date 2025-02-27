// 修复树木消失问题的优化性能方法
function optimizePerformance() {
    const { dynamicQuality, lodDistances } = RENDER_CONFIG;
    
    // 动态质量调整
    if (dynamicQuality && this.fps < 30) {
        // 如果FPS低于30，逐步降低质量
        if (this.renderer.getPixelRatio() > 1) {
            this.renderer.setPixelRatio(this.renderer.getPixelRatio() - 0.25);
        }
        
        // 不再隐藏任何树木，确保它们始终可见
        // 原代码被移除，不再隐藏远处的树木
    }
}
