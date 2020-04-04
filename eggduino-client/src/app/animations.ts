import { trigger, transition, style, animate } from '@angular/animations';

export const collapse = trigger('collapse', [
    transition(':enter', [
        style({ height: 0, overflow: 'hidden' }),
        animate('.3s ease', style({ height: '*', overflow: 'hidden' }))
    ]),
    transition(':leave', [
        style({ height: '*', overflow: 'hidden' }),
        animate('.3s ease', style({ height: 0, overflow: 'hidden' })),
    ]),
]);
