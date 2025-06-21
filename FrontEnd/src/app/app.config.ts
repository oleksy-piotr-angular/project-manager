import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Enable zone-less change detection with event coalescing
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
  ],
};
