import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

type Category = { title: string; emoji: string; hint: string };
type Feature = { title: string; desc: string; emoji: string };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  categories: Category[] = [
    { title: 'Plomería', emoji: '🚰', hint: 'Fugas, grifería, tuberías' },
    { title: 'Electricidad', emoji: '⚡', hint: 'Cortos, tomas, iluminación' },
    { title: 'Carpintería', emoji: '🪚', hint: 'Puertas, muebles, ajustes' },
    { title: 'Pintura', emoji: '🎨', hint: 'Paredes, retoques, acabados' },
    { title: 'Cerrajería', emoji: '🔐', hint: 'Cerraduras, llaves, aperturas' },
    { title: 'Mantenimiento', emoji: '🛠️', hint: 'Arreglos generales' },
  ];

  features: Feature[] = [
    { title: 'Expertos verificados', desc: 'Perfiles con información clara y reputación visible.', emoji: '✅' },
    { title: 'Solicita en minutos', desc: 'Crea una solicitud con detalles y ubicación.', emoji: '⏱️' },
    { title: 'Seguimiento por estado', desc: 'Mira el avance: creada, en proceso, finalizada.', emoji: '📍' },
    { title: 'Reseñas y calificaciones', desc: 'Confianza basada en experiencias reales.', emoji: '⭐' },
  ];

  constructor(private router: Router) {}

  goExperts() {
    this.router.navigate(['/workers']);
  }

  goRequest() {
    this.router.navigate(['/requests/request-create']);
  }
}
