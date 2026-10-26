import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'dur' })
export class DurPipe implements PipeTransform {
  transform(ms: number | undefined | null): string {
    if (ms == null || ms < 0) return '—';
    let s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    return [d ? d + 'd' : '', d || h ? h + 'h' : '', d || h || m ? m + 'm' : '', s + 's'].filter(Boolean).join(' ');
  }
}
