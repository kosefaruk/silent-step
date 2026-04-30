/**
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/NG-ZORRO/ng-zorro-antd/blob/master/LICENSE
 */
/**
 * fit content details: https://github.com/NG-ZORRO/ng-zorro-antd/pull/6154#issuecomment-745025554
 *
 * calc position x,y point
 *
 * CASE (width <= clientWidth && height <= clientHeight):
 *
 * ------------- clientWidth -------------
 * |                                     |
 * |        ------ width ------          |
 * |        |                 |          |
 * |        |                 |          |
 * client   height            |          |
 * Height   |                 |          |
 * |        |                 |          |
 * |        -------------------          |
 * |                                     |
 * |                                     |
 * ---------------------------------------
 * fixedPosition = { x: 0, y: 0 }
 *
 *
 *
 * CASE (width > clientWidth || height > clientHeight):
 *
 * ------------- clientWidth -------------
 * |        |                            |
 * |        top                          |
 * |        |                            |
 * |--left--|--------------- width -----------------
 * |        |                                      |
 * client   |                                      |
 * Height   |                                      |
 * |        |                                      |
 * |        |                                      |
 * |        height                                 |
 * |        |                                      |
 * ---------|                                      |
 *          |                                      |
 *          |                                      |
 *          |                                      |
 *          ----------------------------------------
 *
 *
 * - left || top > 0
 *   left -> 0 || top -> 0
 *
 * - (left + width) < clientWidth || (top + height) < clientHeight
 * - left | top + width | height < clientWidth | clientHeight -> Back left | top + width | height === clientWidth | clientHeight
 *
 * DEFAULT:
 * - hold position
 *
 */
export function getFitContentPosition(params) {
    let fixPos = {};
    if (params.width <= params.clientWidth && params.height <= params.clientHeight) {
        fixPos = {
            x: 0,
            y: 0
        };
    }
    if (params.width > params.clientWidth || params.height > params.clientHeight) {
        fixPos = {
            x: fitPoint(params.left, params.width, params.clientWidth),
            y: fitPoint(params.top, params.height, params.clientHeight)
        };
    }
    return fixPos;
}
export function getOffset(node) {
    const box = node.getBoundingClientRect();
    const docElem = document.documentElement;
    // use docElem.scrollLeft to support IE
    return {
        left: box.left + (window.pageXOffset || docElem.scrollLeft) - (docElem.clientLeft || document.body.clientLeft || 0),
        top: box.top + (window.pageYOffset || docElem.scrollTop) - (docElem.clientTop || document.body.clientTop || 0)
    };
}
export function getClientSize() {
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight;
    return {
        width,
        height
    };
}
function fitPoint(start, size, clientSize) {
    const startAddSize = start + size;
    const offsetStart = (size - clientSize) / 2;
    let distance = null;
    if (size > clientSize) {
        if (start > 0) {
            distance = offsetStart;
        }
        if (start < 0 && startAddSize < clientSize) {
            distance = -offsetStart;
        }
    }
    else {
        if (start < 0 || startAddSize > clientSize) {
            distance = start < 0 ? offsetStart : -offsetStart;
        }
    }
    return distance;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9jb21wb25lbnRzL2ltYWdlL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRztBQUVIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXFERztBQUNILE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxNQU9yQztJQUNDLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUVoQixJQUFJLE1BQU0sQ0FBQyxLQUFLLElBQUksTUFBTSxDQUFDLFdBQVcsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUMvRSxNQUFNLEdBQUc7WUFDUCxDQUFDLEVBQUUsQ0FBQztZQUNKLENBQUMsRUFBRSxDQUFDO1NBQ0wsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFJLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUM3RSxNQUFNLEdBQUc7WUFDUCxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDO1lBQzFELENBQUMsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUM7U0FDNUQsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRUQsTUFBTSxVQUFVLFNBQVMsQ0FBQyxJQUFpQjtJQUN6QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUN6QyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDO0lBRXpDLHVDQUF1QztJQUN2QyxPQUFPO1FBQ0wsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDO1FBQ25ILEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQztLQUMvRyxDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhO0lBQzNCLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDO0lBQ25ELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUM7SUFDM0UsT0FBTztRQUNMLEtBQUs7UUFDTCxNQUFNO0tBQ1AsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxLQUFhLEVBQUUsSUFBWSxFQUFFLFVBQWtCO0lBQy9ELE1BQU0sWUFBWSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7SUFDbEMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzVDLElBQUksUUFBUSxHQUFrQixJQUFJLENBQUM7SUFFbkMsSUFBSSxJQUFJLEdBQUcsVUFBVSxFQUFFLENBQUM7UUFDdEIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDZCxRQUFRLEdBQUcsV0FBVyxDQUFDO1FBQ3pCLENBQUM7UUFDRCxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksWUFBWSxHQUFHLFVBQVUsRUFBRSxDQUFDO1lBQzNDLFFBQVEsR0FBRyxDQUFDLFdBQVcsQ0FBQztRQUMxQixDQUFDO0lBQ0gsQ0FBQztTQUFNLENBQUM7UUFDTixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksWUFBWSxHQUFHLFVBQVUsRUFBRSxDQUFDO1lBQzNDLFFBQVEsR0FBRyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO1FBQ3BELENBQUM7SUFDSCxDQUFDO0lBRUQsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9naXRodWIuY29tL05HLVpPUlJPL25nLXpvcnJvLWFudGQvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICovXG5cbi8qKlxuICogZml0IGNvbnRlbnQgZGV0YWlsczogaHR0cHM6Ly9naXRodWIuY29tL05HLVpPUlJPL25nLXpvcnJvLWFudGQvcHVsbC82MTU0I2lzc3VlY29tbWVudC03NDUwMjU1NTRcbiAqXG4gKiBjYWxjIHBvc2l0aW9uIHgseSBwb2ludFxuICpcbiAqIENBU0UgKHdpZHRoIDw9IGNsaWVudFdpZHRoICYmIGhlaWdodCA8PSBjbGllbnRIZWlnaHQpOlxuICpcbiAqIC0tLS0tLS0tLS0tLS0gY2xpZW50V2lkdGggLS0tLS0tLS0tLS0tLVxuICogfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG4gKiB8ICAgICAgICAtLS0tLS0gd2lkdGggLS0tLS0tICAgICAgICAgIHxcbiAqIHwgICAgICAgIHwgICAgICAgICAgICAgICAgIHwgICAgICAgICAgfFxuICogfCAgICAgICAgfCAgICAgICAgICAgICAgICAgfCAgICAgICAgICB8XG4gKiBjbGllbnQgICBoZWlnaHQgICAgICAgICAgICB8ICAgICAgICAgIHxcbiAqIEhlaWdodCAgIHwgICAgICAgICAgICAgICAgIHwgICAgICAgICAgfFxuICogfCAgICAgICAgfCAgICAgICAgICAgICAgICAgfCAgICAgICAgICB8XG4gKiB8ICAgICAgICAtLS0tLS0tLS0tLS0tLS0tLS0tICAgICAgICAgIHxcbiAqIHwgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIGZpeGVkUG9zaXRpb24gPSB7IHg6IDAsIHk6IDAgfVxuICpcbiAqXG4gKlxuICogQ0FTRSAod2lkdGggPiBjbGllbnRXaWR0aCB8fCBoZWlnaHQgPiBjbGllbnRIZWlnaHQpOlxuICpcbiAqIC0tLS0tLS0tLS0tLS0gY2xpZW50V2lkdGggLS0tLS0tLS0tLS0tLVxuICogfCAgICAgICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICB8XG4gKiB8ICAgICAgICB0b3AgICAgICAgICAgICAgICAgICAgICAgICAgIHxcbiAqIHwgICAgICAgIHwgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogfC0tbGVmdC0tfC0tLS0tLS0tLS0tLS0tLSB3aWR0aCAtLS0tLS0tLS0tLS0tLS0tLVxuICogfCAgICAgICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogY2xpZW50ICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogSGVpZ2h0ICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogfCAgICAgICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogfCAgICAgICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogfCAgICAgICAgaGVpZ2h0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogfCAgICAgICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogLS0tLS0tLS0tfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogICAgICAgICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogICAgICAgICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogICAgICAgICAgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfFxuICogICAgICAgICAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqXG4gKiAtIGxlZnQgfHwgdG9wID4gMFxuICogICBsZWZ0IC0+IDAgfHwgdG9wIC0+IDBcbiAqXG4gKiAtIChsZWZ0ICsgd2lkdGgpIDwgY2xpZW50V2lkdGggfHwgKHRvcCArIGhlaWdodCkgPCBjbGllbnRIZWlnaHRcbiAqIC0gbGVmdCB8IHRvcCArIHdpZHRoIHwgaGVpZ2h0IDwgY2xpZW50V2lkdGggfCBjbGllbnRIZWlnaHQgLT4gQmFjayBsZWZ0IHwgdG9wICsgd2lkdGggfCBoZWlnaHQgPT09IGNsaWVudFdpZHRoIHwgY2xpZW50SGVpZ2h0XG4gKlxuICogREVGQVVMVDpcbiAqIC0gaG9sZCBwb3NpdGlvblxuICpcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpdENvbnRlbnRQb3NpdGlvbihwYXJhbXM6IHtcbiAgd2lkdGg6IG51bWJlcjtcbiAgaGVpZ2h0OiBudW1iZXI7XG4gIGxlZnQ6IG51bWJlcjtcbiAgdG9wOiBudW1iZXI7XG4gIGNsaWVudFdpZHRoOiBudW1iZXI7XG4gIGNsaWVudEhlaWdodDogbnVtYmVyO1xufSk6IHsgeD86IG51bWJlcjsgeT86IG51bWJlciB9IHtcbiAgbGV0IGZpeFBvcyA9IHt9O1xuXG4gIGlmIChwYXJhbXMud2lkdGggPD0gcGFyYW1zLmNsaWVudFdpZHRoICYmIHBhcmFtcy5oZWlnaHQgPD0gcGFyYW1zLmNsaWVudEhlaWdodCkge1xuICAgIGZpeFBvcyA9IHtcbiAgICAgIHg6IDAsXG4gICAgICB5OiAwXG4gICAgfTtcbiAgfVxuXG4gIGlmIChwYXJhbXMud2lkdGggPiBwYXJhbXMuY2xpZW50V2lkdGggfHwgcGFyYW1zLmhlaWdodCA+IHBhcmFtcy5jbGllbnRIZWlnaHQpIHtcbiAgICBmaXhQb3MgPSB7XG4gICAgICB4OiBmaXRQb2ludChwYXJhbXMubGVmdCwgcGFyYW1zLndpZHRoLCBwYXJhbXMuY2xpZW50V2lkdGgpLFxuICAgICAgeTogZml0UG9pbnQocGFyYW1zLnRvcCwgcGFyYW1zLmhlaWdodCwgcGFyYW1zLmNsaWVudEhlaWdodClcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGZpeFBvcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE9mZnNldChub2RlOiBIVE1MRWxlbWVudCk6IHsgbGVmdDogbnVtYmVyOyB0b3A6IG51bWJlciB9IHtcbiAgY29uc3QgYm94ID0gbm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgY29uc3QgZG9jRWxlbSA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuICAvLyB1c2UgZG9jRWxlbS5zY3JvbGxMZWZ0IHRvIHN1cHBvcnQgSUVcbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBib3gubGVmdCArICh3aW5kb3cucGFnZVhPZmZzZXQgfHwgZG9jRWxlbS5zY3JvbGxMZWZ0KSAtIChkb2NFbGVtLmNsaWVudExlZnQgfHwgZG9jdW1lbnQuYm9keS5jbGllbnRMZWZ0IHx8IDApLFxuICAgIHRvcDogYm94LnRvcCArICh3aW5kb3cucGFnZVlPZmZzZXQgfHwgZG9jRWxlbS5zY3JvbGxUb3ApIC0gKGRvY0VsZW0uY2xpZW50VG9wIHx8IGRvY3VtZW50LmJvZHkuY2xpZW50VG9wIHx8IDApXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbGllbnRTaXplKCk6IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfSB7XG4gIGNvbnN0IHdpZHRoID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoO1xuICBjb25zdCBoZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodDtcbiAgcmV0dXJuIHtcbiAgICB3aWR0aCxcbiAgICBoZWlnaHRcbiAgfTtcbn1cblxuZnVuY3Rpb24gZml0UG9pbnQoc3RhcnQ6IG51bWJlciwgc2l6ZTogbnVtYmVyLCBjbGllbnRTaXplOiBudW1iZXIpOiBudW1iZXIgfCBudWxsIHtcbiAgY29uc3Qgc3RhcnRBZGRTaXplID0gc3RhcnQgKyBzaXplO1xuICBjb25zdCBvZmZzZXRTdGFydCA9IChzaXplIC0gY2xpZW50U2l6ZSkgLyAyO1xuICBsZXQgZGlzdGFuY2U6IG51bWJlciB8IG51bGwgPSBudWxsO1xuXG4gIGlmIChzaXplID4gY2xpZW50U2l6ZSkge1xuICAgIGlmIChzdGFydCA+IDApIHtcbiAgICAgIGRpc3RhbmNlID0gb2Zmc2V0U3RhcnQ7XG4gICAgfVxuICAgIGlmIChzdGFydCA8IDAgJiYgc3RhcnRBZGRTaXplIDwgY2xpZW50U2l6ZSkge1xuICAgICAgZGlzdGFuY2UgPSAtb2Zmc2V0U3RhcnQ7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChzdGFydCA8IDAgfHwgc3RhcnRBZGRTaXplID4gY2xpZW50U2l6ZSkge1xuICAgICAgZGlzdGFuY2UgPSBzdGFydCA8IDAgPyBvZmZzZXRTdGFydCA6IC1vZmZzZXRTdGFydDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZGlzdGFuY2U7XG59XG4iXX0=