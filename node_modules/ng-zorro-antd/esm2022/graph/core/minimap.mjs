/**
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/NG-ZORRO/ng-zorro-antd/blob/master/LICENSE
 */
import { drag } from 'd3-drag';
import { pointer, select } from 'd3-selection';
import { zoomIdentity } from 'd3-zoom';
import { reqAnimFrame } from 'ng-zorro-antd/core/polyfill';
const FRAC_VIEWPOINT_AREA = 0.8;
export class Minimap {
    constructor(ngZone, svg, zoomG, mainZoom, minimap, maxWidth, labelPadding) {
        this.ngZone = ngZone;
        this.svg = svg;
        this.zoomG = zoomG;
        this.mainZoom = mainZoom;
        this.minimap = minimap;
        this.maxWidth = maxWidth;
        this.labelPadding = labelPadding;
        this.unlisteners = [];
        const minimapElement = select(minimap);
        const minimapSvgElement = minimapElement.select('svg');
        const viewpointElement = minimapSvgElement.select('rect');
        this.canvas = minimapElement.select('canvas.viewport').node();
        this.canvasRect = this.canvas.getBoundingClientRect();
        const handleEvent = (event) => {
            const minimapOffset = this.minimapOffset();
            const width = Number(viewpointElement.attr('width'));
            const height = Number(viewpointElement.attr('height'));
            const clickCoords = pointer(event, minimapSvgElement.node());
            this.viewpointCoord.x = clickCoords[0] - width / 2 - minimapOffset.x;
            this.viewpointCoord.y = clickCoords[1] - height / 2 - minimapOffset.y;
            this.updateViewpoint();
        };
        this.viewpointCoord = { x: 0, y: 0 };
        const subject = drag().subject(Object);
        const dragEvent = subject.on('drag', handleEvent);
        viewpointElement.datum(this.viewpointCoord).call(dragEvent);
        // Make the minimap clickable.
        minimapSvgElement.on('click', event => {
            if (event.defaultPrevented) {
                // This click was part of a drag event, so suppress it.
                return;
            }
            handleEvent(event);
        });
        this.unlisteners.push(() => {
            subject.on('drag', null);
            minimapSvgElement.on('click', null);
        });
        this.viewpoint = viewpointElement.node();
        this.minimapSvg = minimapSvgElement.node();
        this.canvasBuffer = minimapElement.select('canvas.buffer').node();
        this.update();
    }
    destroy() {
        while (this.unlisteners.length) {
            this.unlisteners.pop()();
        }
    }
    minimapOffset() {
        return {
            x: (this.canvasRect.width - this.minimapSize.width) / 2,
            y: (this.canvasRect.height - this.minimapSize.height) / 2
        };
    }
    updateViewpoint() {
        // Update the coordinates of the viewpoint rectangle.
        select(this.viewpoint).attr('x', this.viewpointCoord.x).attr('y', this.viewpointCoord.y);
        // Update the translation vector of the main svg to reflect the
        // new viewpoint.
        const mainX = (-this.viewpointCoord.x * this.scaleMain) / this.scaleMinimap;
        const mainY = (-this.viewpointCoord.y * this.scaleMain) / this.scaleMinimap;
        select(this.svg).call(this.mainZoom.transform, zoomIdentity.translate(mainX, mainY).scale(this.scaleMain));
    }
    update() {
        let sceneSize = null;
        try {
            // Get the size of the entire scene.
            sceneSize = this.zoomG.getBBox();
            if (sceneSize.width === 0) {
                // There is no scene anymore. We have been detached from the dom.
                return;
            }
        }
        catch (e) {
            // Firefox produced NS_ERROR_FAILURE if we have been
            // detached from the dom.
            return;
        }
        const svgSelection = select(this.svg);
        // Read all the style rules in the document and embed them into the svg.
        // The svg needs to be self contained, i.e. all the style rules need to be
        // embedded so the canvas output matches the origin.
        let stylesText = '';
        for (const k of new Array(document.styleSheets.length).keys()) {
            try {
                const cssRules = document.styleSheets[k].cssRules || document.styleSheets[k].rules;
                if (cssRules == null) {
                    continue;
                }
                for (const i of new Array(cssRules.length).keys()) {
                    // Remove tf-* selectors from the styles.
                    stylesText += `${cssRules[i].cssText.replace(/ ?tf-[\w-]+ ?/g, '')}\n`;
                }
            }
            catch (e) {
                if (e.name !== 'SecurityError') {
                    throw e;
                }
            }
        }
        // Temporarily add the css rules to the main svg.
        const svgStyle = svgSelection.append('style');
        svgStyle.text(stylesText);
        // Temporarily remove the zoom/pan transform from the main svg since we
        // want the minimap to show a zoomed-out and centered view.
        const zoomGSelection = select(this.zoomG);
        const zoomTransform = zoomGSelection.attr('transform');
        zoomGSelection.attr('transform', null);
        // Since we add padding, account for that here.
        sceneSize.height += this.labelPadding * 2;
        sceneSize.width += this.labelPadding * 2;
        // Temporarily assign an explicit width/height to the main svg, since
        // it doesn't have one (uses flex-box), but we need it for the canvas
        // to work.
        svgSelection.attr('width', sceneSize.width).attr('height', sceneSize.height);
        // Since the content inside the svg changed (e.g. a node was expanded),
        // the aspect ratio have also changed. Thus, we need to update the scale
        // factor of the minimap. The scale factor is determined such that both
        // the width and height of the minimap are <= maximum specified w/h.
        this.scaleMinimap = this.maxWidth / Math.max(sceneSize.width, sceneSize.height);
        this.minimapSize = {
            width: sceneSize.width * this.scaleMinimap,
            height: sceneSize.height * this.scaleMinimap
        };
        const minimapOffset = this.minimapOffset();
        // Update the size of the minimap's svg, the buffer canvas and the
        // viewpoint rect.
        select(this.minimapSvg).attr(this.minimapSize);
        select(this.canvasBuffer).attr(this.minimapSize);
        if (this.translate != null && this.zoom != null) {
            // Update the viewpoint rectangle shape since the aspect ratio of the
            // map has changed.
            this.ngZone.runOutsideAngular(() => reqAnimFrame(() => this.zoom()));
        }
        // Serialize the main svg to a string which will be used as the rendering
        // content for the canvas.
        const svgXml = new XMLSerializer().serializeToString(this.svg);
        // Now that the svg is serialized for rendering, remove the temporarily
        // assigned styles, explicit width and height and bring back the pan/zoom
        // transform.
        svgStyle.remove();
        svgSelection.attr('width', '100%').attr('height', '100%');
        zoomGSelection.attr('transform', zoomTransform);
        const image = document.createElement('img');
        const onLoad = () => {
            // Draw the svg content onto the buffer canvas.
            const context = this.canvasBuffer.getContext('2d');
            context.clearRect(0, 0, this.canvasBuffer.width, this.canvasBuffer.height);
            context.drawImage(image, minimapOffset.x, minimapOffset.y, this.minimapSize.width, this.minimapSize.height);
            this.ngZone.runOutsideAngular(() => {
                reqAnimFrame(() => {
                    // Hide the old canvas and show the new buffer canvas.
                    select(this.canvasBuffer).style('display', 'block');
                    select(this.canvas).style('display', 'none');
                    // Swap the two canvases.
                    [this.canvas, this.canvasBuffer] = [this.canvasBuffer, this.canvas];
                });
            });
        };
        image.addEventListener('load', onLoad);
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgXml)}`;
        this.unlisteners.push(() => {
            image.removeEventListener('load', onLoad);
        });
    }
    /**
     * Handles changes in zooming/panning. Should be called from the main svg
     * to notify that a zoom/pan was performed and this minimap will update it's
     * viewpoint rectangle.
     *
     * @param transform
     */
    zoom(transform) {
        if (this.scaleMinimap == null) {
            // Scene is not ready yet.
            return;
        }
        // Update the new translate and scale params, only if specified.
        if (transform) {
            this.translate = [transform.x, transform.y];
            this.scaleMain = transform.k;
        }
        // Update the location of the viewpoint rectangle.
        const svgRect = this.svg.getBoundingClientRect();
        const minimapOffset = this.minimapOffset();
        const viewpointSelection = select(this.viewpoint);
        this.viewpointCoord.x = (-this.translate[0] * this.scaleMinimap) / this.scaleMain;
        this.viewpointCoord.y = (-this.translate[1] * this.scaleMinimap) / this.scaleMain;
        const viewpointWidth = (svgRect.width * this.scaleMinimap) / this.scaleMain;
        const viewpointHeight = (svgRect.height * this.scaleMinimap) / this.scaleMain;
        viewpointSelection
            .attr('x', this.viewpointCoord.x + minimapOffset.x)
            .attr('y', this.viewpointCoord.y + minimapOffset.y)
            .attr('width', viewpointWidth)
            .attr('height', viewpointHeight);
        // Show/hide the minimap depending on the viewpoint area as fraction of the
        // whole minimap.
        const mapWidth = this.minimapSize.width;
        const mapHeight = this.minimapSize.height;
        const x = this.viewpointCoord.x;
        const y = this.viewpointCoord.y;
        const w = Math.min(Math.max(0, x + viewpointWidth), mapWidth) - Math.min(Math.max(0, x), mapWidth);
        const h = Math.min(Math.max(0, y + viewpointHeight), mapHeight) - Math.min(Math.max(0, y), mapHeight);
        const fracIntersect = (w * h) / (mapWidth * mapHeight);
        if (fracIntersect < FRAC_VIEWPOINT_AREA) {
            this.minimap.classList.remove('hidden');
        }
        else {
            this.minimap.classList.add('hidden');
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2NvbXBvbmVudHMvZ3JhcGgvY29yZS9taW5pbWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRztBQUlILE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDL0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDL0MsT0FBTyxFQUFnQixZQUFZLEVBQWlCLE1BQU0sU0FBUyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUszRCxNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQztBQUVoQyxNQUFNLE9BQU8sT0FBTztJQWNsQixZQUNVLE1BQWMsRUFDZCxHQUFrQixFQUNsQixLQUFrQixFQUNsQixRQUE0QyxFQUM1QyxPQUFvQixFQUNwQixRQUFnQixFQUNoQixZQUFvQjtRQU5wQixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsUUFBRyxHQUFILEdBQUcsQ0FBZTtRQUNsQixVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQ2xCLGFBQVEsR0FBUixRQUFRLENBQW9DO1FBQzVDLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDcEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUNoQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQVR0QixnQkFBVyxHQUFtQixFQUFFLENBQUM7UUFXdkMsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0saUJBQWlCLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMxRCxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJ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LENBQUMsQ0FBQztRQUMxQyxDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2QyxDQUFDO0lBQ0gsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2dpdGh1Yi5jb20vTkctWk9SUk8vbmctem9ycm8tYW50ZC9ibG9iL21hc3Rlci9MSUNFTlNFXG4gKi9cblxuaW1wb3J0IHsgTmdab25lIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7IGRyYWcgfSBmcm9tICdkMy1kcmFnJztcbmltcG9ydCB7IHBvaW50ZXIsIHNlbGVjdCB9IGZyb20gJ2QzLXNlbGVjdGlvbic7XG5pbXBvcnQgeyBab29tQmVoYXZpb3IsIHpvb21JZGVudGl0eSwgWm9vbVRyYW5zZm9ybSB9IGZyb20gJ2QzLXpvb20nO1xuXG5pbXBvcnQgeyByZXFBbmltRnJhbWUgfSBmcm9tICduZy16b3Jyby1hbnRkL2NvcmUvcG9seWZpbGwnO1xuaW1wb3J0IHsgTnpTYWZlQW55IH0gZnJvbSAnbmctem9ycm8tYW50ZC9jb3JlL3R5cGVzJztcblxuaW1wb3J0IHsgTnpab29tVHJhbnNmb3JtIH0gZnJvbSAnLi4vaW50ZXJmYWNlJztcblxuY29uc3QgRlJBQ19WSUVXUE9JTlRfQVJFQSA9IDAuODtcblxuZXhwb3J0IGNsYXNzIE1pbmltYXAge1xuICBwcml2YXRlIGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQ7XG4gIHByaXZhdGUgY2FudmFzUmVjdDogQ2xpZW50UmVjdDtcbiAgcHJpdmF0ZSBjYW52YXNCdWZmZXI6IEhUTUxDYW52YXNFbGVtZW50O1xuICBwcml2YXRlIG1pbmltYXBTdmc6IFNWR1NWR0VsZW1lbnQ7XG4gIHByaXZhdGUgdmlld3BvaW50OiBTVkdSZWN0RWxlbWVudDtcbiAgcHJpdmF0ZSBzY2FsZU1pbmltYXAhOiBudW1iZXI7XG4gIHByaXZhdGUgc2NhbGVNYWluITogbnVtYmVyO1xuICBwcml2YXRlIHRyYW5zbGF0ZSE6IFtudW1iZXIsIG51bWJlcl07XG4gIHByaXZhdGUgdmlld3BvaW50Q29vcmQ6IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfTtcbiAgcHJpdmF0ZSBtaW5pbWFwU2l6ZSE6IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfTtcblxuICBwcml2YXRlIHVubGlzdGVuZXJzOiBWb2lkRnVuY3Rpb25bXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgbmdab25lOiBOZ1pvbmUsXG4gICAgcHJpdmF0ZSBzdmc6IFNWR1NWR0VsZW1lbnQsXG4gICAgcHJpdmF0ZSB6b29tRzogU1ZHR0VsZW1lbnQsXG4gICAgcHJpdmF0ZSBtYWluWm9vbTogWm9vbUJlaGF2aW9yPE56U2FmZUFueSwgTnpTYWZlQW55PixcbiAgICBwcml2YXRlIG1pbmltYXA6IEhUTUxFbGVtZW50LFxuICAgIHByaXZhdGUgbWF4V2lkdGg6IG51bWJlcixcbiAgICBwcml2YXRlIGxhYmVsUGFkZGluZzogbnVtYmVyXG4gICkge1xuICAgIGNvbnN0IG1pbmltYXBFbGVtZW50ID0gc2VsZWN0KG1pbmltYXApO1xuICAgIGNvbnN0IG1pbmltYXBTdmdFbGVtZW50ID0gbWluaW1hcEVsZW1lbnQuc2VsZWN0KCdzdmcnKTtcbiAgICBjb25zdCB2aWV3cG9pbnRFbGVtZW50ID0gbWluaW1hcFN2Z0VsZW1lbnQuc2VsZWN0KCdyZWN0Jyk7XG4gICAgdGhpcy5jYW52YXMgPSBtaW5pbWFwRWxlbWVudC5zZWxlY3QoJ2NhbnZhcy52aWV3cG9ydCcpLm5vZGUoKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcbiAgICB0aGlzLmNhbnZhc1JlY3QgPSB0aGlzLmNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIGNvbnN0IGhhbmRsZUV2ZW50ID0gKGV2ZW50OiBOelNhZmVBbnkpOiB2b2lkID0+IHtcbiAgICAgIGNvbnN0IG1pbmltYXBPZmZzZXQgPSB0aGlzLm1pbmltYXBPZmZzZXQoKTtcbiAgICAgIGNvbnN0IHdpZHRoID0gTnVtYmVyKHZpZXdwb2ludEVsZW1lbnQuYXR0cignd2lkdGgnKSk7XG4gICAgICBjb25zdCBoZWlnaHQgPSBOdW1iZXIodmlld3BvaW50RWxlbWVudC5hdHRyKCdoZWlnaHQnKSk7XG4gICAgICBjb25zdCBjbGlja0Nvb3JkcyA9IHBvaW50ZXIoZXZlbnQsIG1pbmltYXBTdmdFbGVtZW50Lm5vZGUoKSBhcyBOelNhZmVBbnkpO1xuICAgICAgdGhpcy52aWV3cG9pbnRDb29yZC54ID0gY2xpY2tDb29yZHNbMF0gLSB3aWR0aCAvIDIgLSBtaW5pbWFwT2Zmc2V0Lng7XG4gICAgICB0aGlzLnZpZXdwb2ludENvb3JkLnkgPSBjbGlja0Nvb3Jkc1sxXSAtIGhlaWdodCAvIDIgLSBtaW5pbWFwT2Zmc2V0Lnk7XG4gICAgICB0aGlzLnVwZGF0ZVZpZXdwb2ludCgpO1xuICAgIH07XG4gICAgdGhpcy52aWV3cG9pbnRDb29yZCA9IHsgeDogMCwgeTogMCB9O1xuICAgIGNvbnN0IHN1YmplY3QgPSBkcmFnKCkuc3ViamVjdChPYmplY3QpO1xuICAgIGNvbnN0IGRyYWdFdmVudCA9IHN1YmplY3Qub24oJ2RyYWcnLCBoYW5kbGVFdmVudCk7XG4gICAgdmlld3BvaW50RWxlbWVudC5kYXR1bSh0aGlzLnZpZXdwb2ludENvb3JkIGFzIE56U2FmZUFueSkuY2FsbChkcmFnRXZlbnQgYXMgTnpTYWZlQW55KTtcblxuICAgIC8vIE1ha2UgdGhlIG1pbmltYXAgY2xpY2thYmxlLlxuICAgIG1pbmltYXBTdmdFbGVtZW50Lm9uKCdjbGljaycsIGV2ZW50ID0+IHtcbiAgICAgIGlmICgoZXZlbnQgYXMgRXZlbnQpLmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgLy8gVGhpcyBjbGljayB3YXMgcGFydCBvZiBhIGRyYWcgZXZlbnQsIHNvIHN1cHByZXNzIGl0LlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBoYW5kbGVFdmVudChldmVudCk7XG4gICAgfSk7XG4gICAgdGhpcy51bmxpc3RlbmVycy5wdXNoKCgpID0+IHtcbiAgICAgIHN1YmplY3Qub24oJ2RyYWcnLCBudWxsKTtcbiAgICAgIG1pbmltYXBTdmdFbGVtZW50Lm9uKCdjbGljaycsIG51bGwpO1xuICAgIH0pO1xuICAgIHRoaXMudmlld3BvaW50ID0gdmlld3BvaW50RWxlbWVudC5ub2RlKCkgYXMgU1ZHUmVjdEVsZW1lbnQ7XG4gICAgdGhpcy5taW5pbWFwU3ZnID0gbWluaW1hcFN2Z0VsZW1lbnQubm9kZSgpIGFzIFNWR1NWR0VsZW1lbnQ7XG4gICAgdGhpcy5jYW52YXNCdWZmZXIgPSBtaW5pbWFwRWxlbWVudC5zZWxlY3QoJ2NhbnZhcy5idWZmZXInKS5ub2RlKCkgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG4gICAgdGhpcy51cGRhdGUoKTtcbiAgfVxuXG4gIGRlc3Ryb3koKTogdm9pZCB7XG4gICAgd2hpbGUgKHRoaXMudW5saXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICB0aGlzLnVubGlzdGVuZXJzLnBvcCgpISgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbWluaW1hcE9mZnNldCgpOiB7IHg6IG51bWJlcjsgeTogbnVtYmVyIH0ge1xuICAgIHJldHVybiB7XG4gICAgICB4OiAodGhpcy5jYW52YXNSZWN0LndpZHRoIC0gdGhpcy5taW5pbWFwU2l6ZS53aWR0aCkgLyAyLFxuICAgICAgeTogKHRoaXMuY2FudmFzUmVjdC5oZWlnaHQgLSB0aGlzLm1pbmltYXBTaXplLmhlaWdodCkgLyAyXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlVmlld3BvaW50KCk6IHZvaWQge1xuICAgIC8vIFVwZGF0ZSB0aGUgY29vcmRpbmF0ZXMgb2YgdGhlIHZpZXdwb2ludCByZWN0YW5nbGUuXG4gICAgc2VsZWN0KHRoaXMudmlld3BvaW50KS5hdHRyKCd4JywgdGhpcy52aWV3cG9pbnRDb29yZC54KS5hdHRyKCd5JywgdGhpcy52aWV3cG9pbnRDb29yZC55KTtcbiAgICAvLyBVcGRhdGUgdGhlIHRyYW5zbGF0aW9uIHZlY3RvciBvZiB0aGUgbWFpbiBzdmcgdG8gcmVmbGVjdCB0aGVcbiAgICAvLyBuZXcgdmlld3BvaW50LlxuICAgIGNvbnN0IG1haW5YID0gKC10aGlzLnZpZXdwb2ludENvb3JkLnggKiB0aGlzLnNjYWxlTWFpbikgLyB0aGlzLnNjYWxlTWluaW1hcDtcbiAgICBjb25zdCBtYWluWSA9ICgtdGhpcy52aWV3cG9pbnRDb29yZC55ICogdGhpcy5zY2FsZU1haW4pIC8gdGhpcy5zY2FsZU1pbmltYXA7XG4gICAgc2VsZWN0KHRoaXMuc3ZnKS5jYWxsKHRoaXMubWFpblpvb20udHJhbnNmb3JtLCB6b29tSWRlbnRpdHkudHJhbnNsYXRlKG1haW5YLCBtYWluWSkuc2NhbGUodGhpcy5zY2FsZU1haW4pKTtcbiAgfVxuXG4gIHVwZGF0ZSgpOiB2b2lkIHtcbiAgICBsZXQgc2NlbmVTaXplID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgLy8gR2V0IHRoZSBzaXplIG9mIHRoZSBlbnRpcmUgc2NlbmUuXG4gICAgICBzY2VuZVNpemUgPSB0aGlzLnpvb21HLmdldEJCb3goKTtcbiAgICAgIGlmIChzY2VuZVNpemUud2lkdGggPT09IDApIHtcbiAgICAgICAgLy8gVGhlcmUgaXMgbm8gc2NlbmUgYW55bW9yZS4gV2UgaGF2ZSBiZWVuIGRldGFjaGVkIGZyb20gdGhlIGRvbS5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIEZpcmVmb3ggcHJvZHVjZWQgTlNfRVJST1JfRkFJTFVSRSBpZiB3ZSBoYXZlIGJlZW5cbiAgICAgIC8vIGRldGFjaGVkIGZyb20gdGhlIGRvbS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzdmdTZWxlY3Rpb24gPSBzZWxlY3QodGhpcy5zdmcpO1xuICAgIC8vIFJlYWQgYWxsIHRoZSBzdHlsZSBydWxlcyBpbiB0aGUgZG9jdW1lbnQgYW5kIGVtYmVkIHRoZW0gaW50byB0aGUgc3ZnLlxuICAgIC8vIFRoZSBzdmcgbmVlZHMgdG8gYmUgc2VsZiBjb250YWluZWQsIGkuZS4gYWxsIHRoZSBzdHlsZSBydWxlcyBuZWVkIHRvIGJlXG4gICAgLy8gZW1iZWRkZWQgc28gdGhlIGNhbnZhcyBvdXRwdXQgbWF0Y2hlcyB0aGUgb3JpZ2luLlxuICAgIGxldCBzdHlsZXNUZXh0ID0gJyc7XG5cbiAgICBmb3IgKGNvbnN0IGsgb2YgbmV3IEFycmF5KGRvY3VtZW50LnN0eWxlU2hlZXRzLmxlbmd0aCkua2V5cygpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjc3NSdWxlcyA9XG4gICAgICAgICAgKGRvY3VtZW50LnN0eWxlU2hlZXRzW2tdIGFzIE56U2FmZUFueSkuY3NzUnVsZXMgfHwgKGRvY3VtZW50LnN0eWxlU2hlZXRzW2tdIGFzIE56U2FmZUFueSkucnVsZXM7XG4gICAgICAgIGlmIChjc3NSdWxlcyA9PSBudWxsKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBpIG9mIG5ldyBBcnJheShjc3NSdWxlcy5sZW5ndGgpLmtleXMoKSkge1xuICAgICAgICAgIC8vIFJlbW92ZSB0Zi0qIHNlbGVjdG9ycyBmcm9tIHRoZSBzdHlsZXMuXG4gICAgICAgICAgc3R5bGVzVGV4dCArPSBgJHtjc3NSdWxlc1tpXS5jc3NUZXh0LnJlcGxhY2UoLyA/dGYtW1xcdy1dKyA/L2csICcnKX1cXG5gO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlOiBOelNhZmVBbnkpIHtcbiAgICAgICAgaWYgKGUubmFtZSAhPT0gJ1NlY3VyaXR5RXJyb3InKSB7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRlbXBvcmFyaWx5IGFkZCB0aGUgY3NzIHJ1bGVzIHRvIHRoZSBtYWluIHN2Zy5cbiAgICBjb25zdCBzdmdTdHlsZSA9IHN2Z1NlbGVjdGlvbi5hcHBlbmQoJ3N0eWxlJyk7XG4gICAgc3ZnU3R5bGUudGV4dChzdHlsZXNUZXh0KTtcblxuICAgIC8vIFRlbXBvcmFyaWx5IHJlbW92ZSB0aGUgem9vbS9wYW4gdHJhbnNmb3JtIGZyb20gdGhlIG1haW4gc3ZnIHNpbmNlIHdlXG4gICAgLy8gd2FudCB0aGUgbWluaW1hcCB0byBzaG93IGEgem9vbWVkLW91dCBhbmQgY2VudGVyZWQgdmlldy5cbiAgICBjb25zdCB6b29tR1NlbGVjdGlvbiA9IHNlbGVjdCh0aGlzLnpvb21HKTtcbiAgICBjb25zdCB6b29tVHJhbnNmb3JtID0gem9vbUdTZWxlY3Rpb24uYXR0cigndHJhbnNmb3JtJyk7XG4gICAgem9vbUdTZWxlY3Rpb24uYXR0cigndHJhbnNmb3JtJywgbnVsbCk7XG5cbiAgICAvLyBTaW5jZSB3ZSBhZGQgcGFkZGluZywgYWNjb3VudCBmb3IgdGhhdCBoZXJlLlxuICAgIHNjZW5lU2l6ZS5oZWlnaHQgKz0gdGhpcy5sYWJlbFBhZGRpbmcgKiAyO1xuICAgIHNjZW5lU2l6ZS53aWR0aCArPSB0aGlzLmxhYmVsUGFkZGluZyAqIDI7XG5cbiAgICAvLyBUZW1wb3JhcmlseSBhc3NpZ24gYW4gZXhwbGljaXQgd2lkdGgvaGVpZ2h0IHRvIHRoZSBtYWluIHN2Zywgc2luY2VcbiAgICAvLyBpdCBkb2Vzbid0IGhhdmUgb25lICh1c2VzIGZsZXgtYm94KSwgYnV0IHdlIG5lZWQgaXQgZm9yIHRoZSBjYW52YXNcbiAgICAvLyB0byB3b3JrLlxuICAgIHN2Z1NlbGVjdGlvbi5hdHRyKCd3aWR0aCcsIHNjZW5lU2l6ZS53aWR0aCkuYXR0cignaGVpZ2h0Jywgc2NlbmVTaXplLmhlaWdodCk7XG5cbiAgICAvLyBTaW5jZSB0aGUgY29udGVudCBpbnNpZGUgdGhlIHN2ZyBjaGFuZ2VkIChlLmcuIGEgbm9kZSB3YXMgZXhwYW5kZWQpLFxuICAgIC8vIHRoZSBhc3BlY3QgcmF0aW8gaGF2ZSBhbHNvIGNoYW5nZWQuIFRodXMsIHdlIG5lZWQgdG8gdXBkYXRlIHRoZSBzY2FsZVxuICAgIC8vIGZhY3RvciBvZiB0aGUgbWluaW1hcC4gVGhlIHNjYWxlIGZhY3RvciBpcyBkZXRlcm1pbmVkIHN1Y2ggdGhhdCBib3RoXG4gICAgLy8gdGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgdGhlIG1pbmltYXAgYXJlIDw9IG1heGltdW0gc3BlY2lmaWVkIHcvaC5cbiAgICB0aGlzLnNjYWxlTWluaW1hcCA9IHRoaXMubWF4V2lkdGggLyBNYXRoLm1heChzY2VuZVNpemUud2lkdGgsIHNjZW5lU2l6ZS5oZWlnaHQpO1xuICAgIHRoaXMubWluaW1hcFNpemUgPSB7XG4gICAgICB3aWR0aDogc2NlbmVTaXplLndpZHRoICogdGhpcy5zY2FsZU1pbmltYXAsXG4gICAgICBoZWlnaHQ6IHNjZW5lU2l6ZS5oZWlnaHQgKiB0aGlzLnNjYWxlTWluaW1hcFxuICAgIH07XG5cbiAgICBjb25zdCBtaW5pbWFwT2Zmc2V0ID0gdGhpcy5taW5pbWFwT2Zmc2V0KCk7XG5cbiAgICAvLyBVcGRhdGUgdGhlIHNpemUgb2YgdGhlIG1pbmltYXAncyBzdmcsIHRoZSBidWZmZXIgY2FudmFzIGFuZCB0aGVcbiAgICAvLyB2aWV3cG9pbnQgcmVjdC5cbiAgICBzZWxlY3QodGhpcy5taW5pbWFwU3ZnKS5hdHRyKHRoaXMubWluaW1hcFNpemUgYXMgTnpTYWZlQW55KTtcbiAgICBzZWxlY3QodGhpcy5jYW52YXNCdWZmZXIpLmF0dHIodGhpcy5taW5pbWFwU2l6ZSBhcyBOelNhZmVBbnkpO1xuXG4gICAgaWYgKHRoaXMudHJhbnNsYXRlICE9IG51bGwgJiYgdGhpcy56b29tICE9IG51bGwpIHtcbiAgICAgIC8vIFVwZGF0ZSB0aGUgdmlld3BvaW50IHJlY3RhbmdsZSBzaGFwZSBzaW5jZSB0aGUgYXNwZWN0IHJhdGlvIG9mIHRoZVxuICAgICAgLy8gbWFwIGhhcyBjaGFuZ2VkLlxuICAgICAgdGhpcy5uZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4gcmVxQW5pbUZyYW1lKCgpID0+IHRoaXMuem9vbSgpKSk7XG4gICAgfVxuXG4gICAgLy8gU2VyaWFsaXplIHRoZSBtYWluIHN2ZyB0byBhIHN0cmluZyB3aGljaCB3aWxsIGJlIHVzZWQgYXMgdGhlIHJlbmRlcmluZ1xuICAgIC8vIGNvbnRlbnQgZm9yIHRoZSBjYW52YXMuXG4gICAgY29uc3Qgc3ZnWG1sID0gbmV3IFhNTFNlcmlhbGl6ZXIoKS5zZXJpYWxpemVUb1N0cmluZyh0aGlzLnN2Zyk7XG5cbiAgICAvLyBOb3cgdGhhdCB0aGUgc3ZnIGlzIHNlcmlhbGl6ZWQgZm9yIHJlbmRlcmluZywgcmVtb3ZlIHRoZSB0ZW1wb3JhcmlseVxuICAgIC8vIGFzc2lnbmVkIHN0eWxlcywgZXhwbGljaXQgd2lkdGggYW5kIGhlaWdodCBhbmQgYnJpbmcgYmFjayB0aGUgcGFuL3pvb21cbiAgICAvLyB0cmFuc2Zvcm0uXG4gICAgc3ZnU3R5bGUucmVtb3ZlKCk7XG4gICAgc3ZnU2VsZWN0aW9uLmF0dHIoJ3dpZHRoJywgJzEwMCUnKS5hdHRyKCdoZWlnaHQnLCAnMTAwJScpO1xuXG4gICAgem9vbUdTZWxlY3Rpb24uYXR0cigndHJhbnNmb3JtJywgem9vbVRyYW5zZm9ybSk7XG5cbiAgICBjb25zdCBpbWFnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuICAgIGNvbnN0IG9uTG9hZCA9ICgpOiB2b2lkID0+IHtcbiAgICAgIC8vIERyYXcgdGhlIHN2ZyBjb250ZW50IG9udG8gdGhlIGJ1ZmZlciBjYW52YXMuXG4gICAgICBjb25zdCBjb250ZXh0ID0gdGhpcy5jYW52YXNCdWZmZXIuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgIGNvbnRleHQhLmNsZWFyUmVjdCgwLCAwLCB0aGlzLmNhbnZhc0J1ZmZlci53aWR0aCwgdGhpcy5jYW52YXNCdWZmZXIuaGVpZ2h0KTtcblxuICAgICAgY29udGV4dCEuZHJhd0ltYWdlKGltYWdlLCBtaW5pbWFwT2Zmc2V0LngsIG1pbmltYXBPZmZzZXQueSwgdGhpcy5taW5pbWFwU2l6ZS53aWR0aCwgdGhpcy5taW5pbWFwU2l6ZS5oZWlnaHQpO1xuXG4gICAgICB0aGlzLm5nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICAgIHJlcUFuaW1GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgLy8gSGlkZSB0aGUgb2xkIGNhbnZhcyBhbmQgc2hvdyB0aGUgbmV3IGJ1ZmZlciBjYW52YXMuXG4gICAgICAgICAgc2VsZWN0KHRoaXMuY2FudmFzQnVmZmVyKS5zdHlsZSgnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICAgIHNlbGVjdCh0aGlzLmNhbnZhcykuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICAgICAgIC8vIFN3YXAgdGhlIHR3byBjYW52YXNlcy5cbiAgICAgICAgICBbdGhpcy5jYW52YXMsIHRoaXMuY2FudmFzQnVmZmVyXSA9IFt0aGlzLmNhbnZhc0J1ZmZlciwgdGhpcy5jYW52YXNdO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBpbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgb25Mb2FkKTtcbiAgICBpbWFnZS5zcmMgPSBgZGF0YTppbWFnZS9zdmcreG1sO2NoYXJzZXQ9dXRmLTgsJHtlbmNvZGVVUklDb21wb25lbnQoc3ZnWG1sKX1gO1xuXG4gICAgdGhpcy51bmxpc3RlbmVycy5wdXNoKCgpID0+IHtcbiAgICAgIGltYWdlLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBvbkxvYWQpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgY2hhbmdlcyBpbiB6b29taW5nL3Bhbm5pbmcuIFNob3VsZCBiZSBjYWxsZWQgZnJvbSB0aGUgbWFpbiBzdmdcbiAgICogdG8gbm90aWZ5IHRoYXQgYSB6b29tL3BhbiB3YXMgcGVyZm9ybWVkIGFuZCB0aGlzIG1pbmltYXAgd2lsbCB1cGRhdGUgaXQnc1xuICAgKiB2aWV3cG9pbnQgcmVjdGFuZ2xlLlxuICAgKlxuICAgKiBAcGFyYW0gdHJhbnNmb3JtXG4gICAqL1xuICB6b29tKHRyYW5zZm9ybT86IFpvb21UcmFuc2Zvcm0gfCBOelpvb21UcmFuc2Zvcm0pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zY2FsZU1pbmltYXAgPT0gbnVsbCkge1xuICAgICAgLy8gU2NlbmUgaXMgbm90IHJlYWR5IHlldC5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gVXBkYXRlIHRoZSBuZXcgdHJhbnNsYXRlIGFuZCBzY2FsZSBwYXJhbXMsIG9ubHkgaWYgc3BlY2lmaWVkLlxuICAgIGlmICh0cmFuc2Zvcm0pIHtcbiAgICAgIHRoaXMudHJhbnNsYXRlID0gW3RyYW5zZm9ybS54LCB0cmFuc2Zvcm0ueV07XG4gICAgICB0aGlzLnNjYWxlTWFpbiA9IHRyYW5zZm9ybS5rO1xuICAgIH1cblxuICAgIC8vIFVwZGF0ZSB0aGUgbG9jYXRpb24gb2YgdGhlIHZpZXdwb2ludCByZWN0YW5nbGUuXG4gICAgY29uc3Qgc3ZnUmVjdCA9IHRoaXMuc3ZnLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IG1pbmltYXBPZmZzZXQgPSB0aGlzLm1pbmltYXBPZmZzZXQoKTtcbiAgICBjb25zdCB2aWV3cG9pbnRTZWxlY3Rpb24gPSBzZWxlY3QodGhpcy52aWV3cG9pbnQpO1xuICAgIHRoaXMudmlld3BvaW50Q29vcmQueCA9ICgtdGhpcy50cmFuc2xhdGVbMF0gKiB0aGlzLnNjYWxlTWluaW1hcCkgLyB0aGlzLnNjYWxlTWFpbjtcbiAgICB0aGlzLnZpZXdwb2ludENvb3JkLnkgPSAoLXRoaXMudHJhbnNsYXRlWzFdICogdGhpcy5zY2FsZU1pbmltYXApIC8gdGhpcy5zY2FsZU1haW47XG4gICAgY29uc3Qgdmlld3BvaW50V2lkdGggPSAoc3ZnUmVjdC53aWR0aCAqIHRoaXMuc2NhbGVNaW5pbWFwKSAvIHRoaXMuc2NhbGVNYWluO1xuICAgIGNvbnN0IHZpZXdwb2ludEhlaWdodCA9IChzdmdSZWN0LmhlaWdodCAqIHRoaXMuc2NhbGVNaW5pbWFwKSAvIHRoaXMuc2NhbGVNYWluO1xuICAgIHZpZXdwb2ludFNlbGVjdGlvblxuICAgICAgLmF0dHIoJ3gnLCB0aGlzLnZpZXdwb2ludENvb3JkLnggKyBtaW5pbWFwT2Zmc2V0LngpXG4gICAgICAuYXR0cigneScsIHRoaXMudmlld3BvaW50Q29vcmQueSArIG1pbmltYXBPZmZzZXQueSlcbiAgICAgIC5hdHRyKCd3aWR0aCcsIHZpZXdwb2ludFdpZHRoKVxuICAgICAgLmF0dHIoJ2hlaWdodCcsIHZpZXdwb2ludEhlaWdodCk7XG4gICAgLy8gU2hvdy9oaWRlIHRoZSBtaW5pbWFwIGRlcGVuZGluZyBvbiB0aGUgdmlld3BvaW50IGFyZWEgYXMgZnJhY3Rpb24gb2YgdGhlXG4gICAgLy8gd2hvbGUgbWluaW1hcC5cbiAgICBjb25zdCBtYXBXaWR0aCA9IHRoaXMubWluaW1hcFNpemUud2lkdGg7XG4gICAgY29uc3QgbWFwSGVpZ2h0ID0gdGhpcy5taW5pbWFwU2l6ZS5oZWlnaHQ7XG4gICAgY29uc3QgeCA9IHRoaXMudmlld3BvaW50Q29vcmQueDtcbiAgICBjb25zdCB5ID0gdGhpcy52aWV3cG9pbnRDb29yZC55O1xuICAgIGNvbnN0IHcgPSBNYXRoLm1pbihNYXRoLm1heCgwLCB4ICsgdmlld3BvaW50V2lkdGgpLCBtYXBXaWR0aCkgLSBNYXRoLm1pbihNYXRoLm1heCgwLCB4KSwgbWFwV2lkdGgpO1xuICAgIGNvbnN0IGggPSBNYXRoLm1pbihNYXRoLm1heCgwLCB5ICsgdmlld3BvaW50SGVpZ2h0KSwgbWFwSGVpZ2h0KSAtIE1hdGgubWluKE1hdGgubWF4KDAsIHkpLCBtYXBIZWlnaHQpO1xuICAgIGNvbnN0IGZyYWNJbnRlcnNlY3QgPSAodyAqIGgpIC8gKG1hcFdpZHRoICogbWFwSGVpZ2h0KTtcbiAgICBpZiAoZnJhY0ludGVyc2VjdCA8IEZSQUNfVklFV1BPSU5UX0FSRUEpIHtcbiAgICAgIHRoaXMubWluaW1hcC5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5taW5pbWFwLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgIH1cbiAgfVxufVxuIl19