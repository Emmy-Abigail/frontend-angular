import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-public-layout',
  styleUrl: './public-layout.css',
  templateUrl: './public-layout.html',
})
export class PublicLayout {}