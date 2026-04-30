/**
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/NG-ZORRO/ng-zorro-antd/blob/master/LICENSE
 */
import { animate, state, style, transition, trigger } from '@angular/animations';
import { AnimationDuration } from './animation-consts';
export const tabSwitchMotion = trigger('tabSwitchMotion', [
    state('leave', style({
        display: 'none'
    })),
    transition('* => enter', [
        style({
            display: 'block',
            opacity: 0
        }),
        animate(AnimationDuration.SLOW)
    ]),
    transition('* => leave, :leave', [
        style({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%'
        }),
        animate(AnimationDuration.SLOW, style({
            opacity: 0
        })),
        style({
            display: 'none'
        })
    ])
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFicy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2NvbXBvbmVudHMvY29yZS9hbmltYXRpb24vdGFicy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7QUFFSCxPQUFPLEVBQTRCLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUV2RCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQTZCLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtJQUNsRixLQUFLLENBQ0gsT0FBTyxFQUNQLEtBQUssQ0FBQztRQUNKLE9BQU8sRUFBRSxNQUFNO0tBQ2hCLENBQUMsQ0FDSDtJQUNELFVBQVUsQ0FBQyxZQUFZLEVBQUU7UUFDdkIsS0FBSyxDQUFDO1lBQ0osT0FBTyxFQUFFLE9BQU87WUFDaEIsT0FBTyxFQUFFLENBQUM7U0FDWCxDQUFDO1FBQ0YsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztLQUNoQyxDQUFDO0lBQ0YsVUFBVSxDQUFDLG9CQUFvQixFQUFFO1FBQy9CLEtBQUssQ0FBQztZQUNKLFFBQVEsRUFBRSxVQUFVO1lBQ3BCLEdBQUcsRUFBRSxDQUFDO1lBQ04sSUFBSSxFQUFFLENBQUM7WUFDUCxLQUFLLEVBQUUsTUFBTTtTQUNkLENBQUM7UUFDRixPQUFPLENBQ0wsaUJBQWlCLENBQUMsSUFBSSxFQUN0QixLQUFLLENBQUM7WUFDSixPQUFPLEVBQUUsQ0FBQztTQUNYLENBQUMsQ0FDSDtRQUNELEtBQUssQ0FBQztZQUNKLE9BQU8sRUFBRSxNQUFNO1NBQ2hCLENBQUM7S0FDSCxDQUFDO0NBQ0gsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2dpdGh1Yi5jb20vTkctWk9SUk8vbmctem9ycm8tYW50ZC9ibG9iL21hc3Rlci9MSUNFTlNFXG4gKi9cblxuaW1wb3J0IHsgQW5pbWF0aW9uVHJpZ2dlck1ldGFkYXRhLCBhbmltYXRlLCBzdGF0ZSwgc3R5bGUsIHRyYW5zaXRpb24sIHRyaWdnZXIgfSBmcm9tICdAYW5ndWxhci9hbmltYXRpb25zJztcblxuaW1wb3J0IHsgQW5pbWF0aW9uRHVyYXRpb24gfSBmcm9tICcuL2FuaW1hdGlvbi1jb25zdHMnO1xuXG5leHBvcnQgY29uc3QgdGFiU3dpdGNoTW90aW9uOiBBbmltYXRpb25UcmlnZ2VyTWV0YWRhdGEgPSB0cmlnZ2VyKCd0YWJTd2l0Y2hNb3Rpb24nLCBbXG4gIHN0YXRlKFxuICAgICdsZWF2ZScsXG4gICAgc3R5bGUoe1xuICAgICAgZGlzcGxheTogJ25vbmUnXG4gICAgfSlcbiAgKSxcbiAgdHJhbnNpdGlvbignKiA9PiBlbnRlcicsIFtcbiAgICBzdHlsZSh7XG4gICAgICBkaXNwbGF5OiAnYmxvY2snLFxuICAgICAgb3BhY2l0eTogMFxuICAgIH0pLFxuICAgIGFuaW1hdGUoQW5pbWF0aW9uRHVyYXRpb24uU0xPVylcbiAgXSksXG4gIHRyYW5zaXRpb24oJyogPT4gbGVhdmUsIDpsZWF2ZScsIFtcbiAgICBzdHlsZSh7XG4gICAgICBwb3NpdGlvbjogJ2Fic29sdXRlJyxcbiAgICAgIHRvcDogMCxcbiAgICAgIGxlZnQ6IDAsXG4gICAgICB3aWR0aDogJzEwMCUnXG4gICAgfSksXG4gICAgYW5pbWF0ZShcbiAgICAgIEFuaW1hdGlvbkR1cmF0aW9uLlNMT1csXG4gICAgICBzdHlsZSh7XG4gICAgICAgIG9wYWNpdHk6IDBcbiAgICAgIH0pXG4gICAgKSxcbiAgICBzdHlsZSh7XG4gICAgICBkaXNwbGF5OiAnbm9uZSdcbiAgICB9KVxuICBdKVxuXSk7XG4iXX0=