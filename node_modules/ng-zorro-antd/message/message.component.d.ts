import { ChangeDetectorRef, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { NzMNComponent } from './base';
import { NzMessageData } from './typings';
import * as i0 from "@angular/core";
export declare class NzMessageComponent extends NzMNComponent implements OnInit, OnDestroy {
    instance: Required<NzMessageData>;
    readonly destroyed: EventEmitter<{
        id: string;
        userAction: boolean;
    }>;
    constructor(cdr: ChangeDetectorRef);
    static ɵfac: i0.ɵɵFactoryDeclaration<NzMessageComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<NzMessageComponent, "nz-message", ["nzMessage"], { "instance": { "alias": "instance"; "required": false; }; }, { "destroyed": "destroyed"; }, never, never, true, never>;
}
