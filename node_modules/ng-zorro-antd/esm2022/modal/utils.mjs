/**
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/NG-ZORRO/ng-zorro-antd/blob/master/LICENSE
 */
export function applyConfigDefaults(config, defaultOptions) {
    return { ...defaultOptions, ...config };
}
export function getValueWithConfig(userValue, configValue, defaultValue) {
    return typeof userValue === 'undefined'
        ? typeof configValue === 'undefined'
            ? defaultValue
            : configValue
        : userValue;
}
export function getConfigFromComponent(component) {
    const { nzCentered, nzMask, nzMaskClosable, nzClosable, nzOkLoading, nzOkDisabled, nzCancelDisabled, nzCancelLoading, nzKeyboard, nzNoAnimation, nzDraggable, nzContent, nzFooter, nzZIndex, nzWidth, nzWrapClassName, nzClassName, nzStyle, nzTitle, nzCloseIcon, nzMaskStyle, nzBodyStyle, nzOkText, nzCancelText, nzOkType, nzOkDanger, nzIconType, nzModalType, nzOnOk, nzOnCancel, nzAfterOpen, nzAfterClose, nzCloseOnNavigation, nzAutofocus } = component;
    return {
        nzCentered,
        nzMask,
        nzMaskClosable,
        nzDraggable,
        nzClosable,
        nzOkLoading,
        nzOkDisabled,
        nzCancelDisabled,
        nzCancelLoading,
        nzKeyboard,
        nzNoAnimation,
        nzContent,
        nzFooter,
        nzZIndex,
        nzWidth,
        nzWrapClassName,
        nzClassName,
        nzStyle,
        nzTitle,
        nzCloseIcon,
        nzMaskStyle,
        nzBodyStyle,
        nzOkText,
        nzCancelText,
        nzOkType,
        nzOkDanger,
        nzIconType,
        nzModalType,
        nzOnOk,
        nzOnCancel,
        nzAfterOpen,
        nzAfterClose,
        nzCloseOnNavigation,
        nzAutofocus
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9jb21wb25lbnRzL21vZGFsL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRztBQUlILE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxNQUFvQixFQUFFLGNBQTRCO0lBQ3BGLE9BQU8sRUFBRSxHQUFHLGNBQWMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO0FBQzFDLENBQUM7QUFFRCxNQUFNLFVBQVUsa0JBQWtCLENBQ2hDLFNBQXdCLEVBQ3hCLFdBQTBCLEVBQzFCLFlBQWU7SUFFZixPQUFPLE9BQU8sU0FBUyxLQUFLLFdBQVc7UUFDckMsQ0FBQyxDQUFDLE9BQU8sV0FBVyxLQUFLLFdBQVc7WUFDbEMsQ0FBQyxDQUFDLFlBQVk7WUFDZCxDQUFDLENBQUMsV0FBVztRQUNmLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDaEIsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FBeUIsU0FBWTtJQUN6RSxNQUFNLEVBQ0osVUFBVSxFQUNWLE1BQU0sRUFDTixjQUFjLEVBQ2QsVUFBVSxFQUNWLFdBQVcsRUFDWCxZQUFZLEVBQ1osZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZixVQUFVLEVBQ1YsYUFBYSxFQUNiLFdBQVcsRUFDWCxTQUFTLEVBQ1QsUUFBUSxFQUNSLFFBQVEsRUFDUixPQUFPLEVBQ1AsZUFBZSxFQUNmLFdBQVcsRUFDWCxPQUFPLEVBQ1AsT0FBTyxFQUNQLFdBQVcsRUFDWCxXQUFXLEVBQ1gsV0FBVyxFQUNYLFFBQVEsRUFDUixZQUFZLEVBQ1osUUFBUSxFQUNSLFVBQVUsRUFDVixVQUFVLEVBQ1YsV0FBVyxFQUNYLE1BQU0sRUFDTixVQUFVLEVBQ1YsV0FBVyxFQUNYLFlBQVksRUFDWixtQkFBbUIsRUFDbkIsV0FBVyxFQUNaLEdBQUcsU0FBUyxDQUFDO0lBQ2QsT0FBTztRQUNMLFVBQVU7UUFDVixNQUFNO1FBQ04sY0FBYztRQUNkLFdBQVc7UUFDWCxVQUFVO1FBQ1YsV0FBVztRQUNYLFlBQVk7UUFDWixnQkFBZ0I7UUFDaEIsZUFBZTtRQUNmLFVBQVU7UUFDVixhQUFhO1FBQ2IsU0FBUztRQUNULFFBQVE7UUFDUixRQUFRO1FBQ1IsT0FBTztRQUNQLGVBQWU7UUFDZixXQUFXO1FBQ1gsT0FBTztRQUNQLE9BQU87UUFDUCxXQUFXO1FBQ1gsV0FBVztRQUNYLFdBQVc7UUFDWCxRQUFRO1FBQ1IsWUFBWTtRQUNaLFFBQVE7UUFDUixVQUFVO1FBQ1YsVUFBVTtRQUNWLFdBQVc7UUFDWCxNQUFNO1FBQ04sVUFBVTtRQUNWLFdBQVc7UUFDWCxZQUFZO1FBQ1osbUJBQW1CO1FBQ25CLFdBQVc7S0FDWixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9naXRodWIuY29tL05HLVpPUlJPL25nLXpvcnJvLWFudGQvYmxvYi9tYXN0ZXIvTElDRU5TRVxuICovXG5cbmltcG9ydCB7IE1vZGFsT3B0aW9ucyB9IGZyb20gJy4vbW9kYWwtdHlwZXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlDb25maWdEZWZhdWx0cyhjb25maWc6IE1vZGFsT3B0aW9ucywgZGVmYXVsdE9wdGlvbnM6IE1vZGFsT3B0aW9ucyk6IE1vZGFsT3B0aW9ucyB7XG4gIHJldHVybiB7IC4uLmRlZmF1bHRPcHRpb25zLCAuLi5jb25maWcgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFZhbHVlV2l0aENvbmZpZzxUPihcbiAgdXNlclZhbHVlOiBUIHwgdW5kZWZpbmVkLFxuICBjb25maWdWYWx1ZTogVCB8IHVuZGVmaW5lZCxcbiAgZGVmYXVsdFZhbHVlOiBUXG4pOiBUIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIHR5cGVvZiB1c2VyVmFsdWUgPT09ICd1bmRlZmluZWQnXG4gICAgPyB0eXBlb2YgY29uZmlnVmFsdWUgPT09ICd1bmRlZmluZWQnXG4gICAgICA/IGRlZmF1bHRWYWx1ZVxuICAgICAgOiBjb25maWdWYWx1ZVxuICAgIDogdXNlclZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnRnJvbUNvbXBvbmVudDxUIGV4dGVuZHMgTW9kYWxPcHRpb25zPihjb21wb25lbnQ6IFQpOiBNb2RhbE9wdGlvbnMge1xuICBjb25zdCB7XG4gICAgbnpDZW50ZXJlZCxcbiAgICBuek1hc2ssXG4gICAgbnpNYXNrQ2xvc2FibGUsXG4gICAgbnpDbG9zYWJsZSxcbiAgICBuek9rTG9hZGluZyxcbiAgICBuek9rRGlzYWJsZWQsXG4gICAgbnpDYW5jZWxEaXNhYmxlZCxcbiAgICBuekNhbmNlbExvYWRpbmcsXG4gICAgbnpLZXlib2FyZCxcbiAgICBuek5vQW5pbWF0aW9uLFxuICAgIG56RHJhZ2dhYmxlLFxuICAgIG56Q29udGVudCxcbiAgICBuekZvb3RlcixcbiAgICBuelpJbmRleCxcbiAgICBueldpZHRoLFxuICAgIG56V3JhcENsYXNzTmFtZSxcbiAgICBuekNsYXNzTmFtZSxcbiAgICBuelN0eWxlLFxuICAgIG56VGl0bGUsXG4gICAgbnpDbG9zZUljb24sXG4gICAgbnpNYXNrU3R5bGUsXG4gICAgbnpCb2R5U3R5bGUsXG4gICAgbnpPa1RleHQsXG4gICAgbnpDYW5jZWxUZXh0LFxuICAgIG56T2tUeXBlLFxuICAgIG56T2tEYW5nZXIsXG4gICAgbnpJY29uVHlwZSxcbiAgICBuek1vZGFsVHlwZSxcbiAgICBuek9uT2ssXG4gICAgbnpPbkNhbmNlbCxcbiAgICBuekFmdGVyT3BlbixcbiAgICBuekFmdGVyQ2xvc2UsXG4gICAgbnpDbG9zZU9uTmF2aWdhdGlvbixcbiAgICBuekF1dG9mb2N1c1xuICB9ID0gY29tcG9uZW50O1xuICByZXR1cm4ge1xuICAgIG56Q2VudGVyZWQsXG4gICAgbnpNYXNrLFxuICAgIG56TWFza0Nsb3NhYmxlLFxuICAgIG56RHJhZ2dhYmxlLFxuICAgIG56Q2xvc2FibGUsXG4gICAgbnpPa0xvYWRpbmcsXG4gICAgbnpPa0Rpc2FibGVkLFxuICAgIG56Q2FuY2VsRGlzYWJsZWQsXG4gICAgbnpDYW5jZWxMb2FkaW5nLFxuICAgIG56S2V5Ym9hcmQsXG4gICAgbnpOb0FuaW1hdGlvbixcbiAgICBuekNvbnRlbnQsXG4gICAgbnpGb290ZXIsXG4gICAgbnpaSW5kZXgsXG4gICAgbnpXaWR0aCxcbiAgICBueldyYXBDbGFzc05hbWUsXG4gICAgbnpDbGFzc05hbWUsXG4gICAgbnpTdHlsZSxcbiAgICBuelRpdGxlLFxuICAgIG56Q2xvc2VJY29uLFxuICAgIG56TWFza1N0eWxlLFxuICAgIG56Qm9keVN0eWxlLFxuICAgIG56T2tUZXh0LFxuICAgIG56Q2FuY2VsVGV4dCxcbiAgICBuek9rVHlwZSxcbiAgICBuek9rRGFuZ2VyLFxuICAgIG56SWNvblR5cGUsXG4gICAgbnpNb2RhbFR5cGUsXG4gICAgbnpPbk9rLFxuICAgIG56T25DYW5jZWwsXG4gICAgbnpBZnRlck9wZW4sXG4gICAgbnpBZnRlckNsb3NlLFxuICAgIG56Q2xvc2VPbk5hdmlnYXRpb24sXG4gICAgbnpBdXRvZm9jdXNcbiAgfTtcbn1cbiJdfQ==