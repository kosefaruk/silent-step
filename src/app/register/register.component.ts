import {Component, inject, OnInit} from '@angular/core';
import {GlobalService} from '../service/global.service';
import {DeviceInfo} from '../model/DeviceInfo';
import {collection, doc, Firestore, setDoc} from '@angular/fire/firestore';
import {Router} from '@angular/router';
import {NzButtonModule} from 'ng-zorro-antd/button';
import {NzFormModule} from 'ng-zorro-antd/form';
import {NzInputModule} from 'ng-zorro-antd/input';
import {FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {NzIconModule} from 'ng-zorro-antd/icon';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faArrowRight, faHashtag} from '@fortawesome/free-solid-svg-icons';
import {faUser} from '@fortawesome/free-regular-svg-icons';
import {NzModalModule, NzModalService} from 'ng-zorro-antd/modal';
import {NzCardComponent} from 'ng-zorro-antd/card';
import {NgIf} from "@angular/common";

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        NzButtonModule,
        NzFormModule,
        NzInputModule,
        NzIconModule,
        FormsModule,
        FontAwesomeModule,
        NzModalModule,
        NzCardComponent,
        NgIf
    ],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css',
    schemas: []
})
export class RegisterComponent implements OnInit {
    deviceInfo: DeviceInfo | undefined;
    firestore = inject(Firestore);
    validateForm;

    faIconList = {
        faArrowRight,
        faHashtag,
        faUser
    };

    isVisible = false;

    constructor(
        private globalService: GlobalService,
        private router: Router,
        private fb: NonNullableFormBuilder,
        private modalService: NzModalService
    ) {
        this.validateForm = this.fb.group({
            schoolNumber: this.fb.control('', [Validators.required]),
            name: this.fb.control('', [Validators.required]),
            age: this.fb.control('', [
                Validators.required,
                Validators.min(6),
                Validators.max(18),
                Validators.pattern(/^\d+$/) // tam sayı kontrolü
            ])
        });
    }

    async ngOnInit() {
        this.deviceInfo = await this.globalService.getDeviceInfo();
    }

    register(): void {
        if (this.validateForm.invalid) {
            this.validateForm.markAllAsTouched();
            return;
        }

        const age = Number(this.validateForm.value.age);

        // ekstra güvenlik (6-18 dahil + tam sayı)
        if (!Number.isInteger(age) || age < 6 || age > 18) {
            return;
        }

        this.isVisible = true;
    }

    async handleOk() {
        if (this.validateForm.invalid) return;

        const age = Number(this.validateForm.value.age);
        if (!Number.isInteger(age) || age < 6 || age > 18) return;

        this.isVisible = false;

        const itemCollection = collection(this.firestore, 'user');

        await setDoc(doc(itemCollection, this.deviceInfo?.uuid), {
            uuid: this.deviceInfo?.uuid,
            createDate: new Date(),
            deviceInfo: this.deviceInfo,
            nameSurname: this.validateForm.value.name,
            schoolNumber: this.validateForm.value.schoolNumber,
            age: age, // birthDate yerine age
            difficulty: '1'
        })
            .then(() => {
                this.router.navigate(['']);
            })
            .catch(() => {
            });
    }

    handleCancel() {
        this.isVisible = false;
    }
}