import { SKELETON_CONFIG } from './config.js';
import { shadowRenderer } from './shadowRenderer.js';

class Renderer {
    constructor() {
        this.skeletonCanvas = null;
        this.skeletonCtx = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        this.initSkeletonCanvas();
        shadowRenderer.init();
        this.initialized = true;
    }

    initSkeletonCanvas() {
        this.skeletonCanvas = document.getElementById('skeletonCanvas');
        if (!this.skeletonCanvas) {
            console.error('找不到骨骼画布元素');
            return;
        }
        this.skeletonCtx = this.skeletonCanvas.getContext('2d');
        this.skeletonCanvas.width = 320;
        this.skeletonCanvas.height = 240;
    }

    clearCanvas(ctx) {
        if (!ctx || !ctx.canvas) return;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // drawSkeleton(results) {
    //     if (!this.initialized) this.init();
    //     if (!this.skeletonCtx || !results || !results.poseLandmarks) return;

    //     this.clearCanvas(this.skeletonCtx);
    //     const ctx = this.skeletonCtx;

    //     // 镜像处理
    //     ctx.save();
    //     ctx.scale(-1, 1);
    //     ctx.translate(-ctx.canvas.width, 0);

    //     // 绘制连接线
    //     ctx.strokeStyle = SKELETON_CONFIG.color;
    //     ctx.lineWidth = SKELETON_CONFIG.lineWidth;

    //     SKELETON_CONFIG.connections.forEach(([start, end]) => {
    //         const startPoint = results.poseLandmarks[start];
    //         const endPoint = results.poseLandmarks[end];

    //         if (startPoint && endPoint) {
    //             ctx.beginPath();
    //             ctx.moveTo(startPoint.x * ctx.canvas.width, startPoint.y * ctx.canvas.height);
    //             ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
    //             ctx.stroke();
    //         }
    //     });

    //     // 绘制关键点
    //     ctx.fillStyle = SKELETON_CONFIG.color;
    //     results.poseLandmarks.forEach(point => {
    //         if (point) {
    //             ctx.beginPath();
    //             ctx.arc(
    //                 point.x * ctx.canvas.width,
    //                 point.y * ctx.canvas.height,
    //                 SKELETON_CONFIG.radius,
    //                 0,
    //                 2 * Math.PI
    //             );
    //             ctx.fill();
    //         }
    //     });

    //     ctx.restore();
    // }

    updateShadow(video, results) {
        if (!results || !results.poseLandmarks) return;
        shadowRenderer.render(results.poseLandmarks);
    }
}

export const renderer = new Renderer();
