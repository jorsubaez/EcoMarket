import { Routes } from '@angular/router';
// Importamos tus componentes
import { Inicio } from './inicio/inicio';
import { Catalogo } from './catalogo/catalogo';
import { Contacto } from './contacto/contacto';
import { Detalle } from './detalle/detalle';
import { LoginComponent } from './login/login';
import { Productores } from './productores/productores';
import { RegistroComponent } from './registro/registro';
import { Perfil } from './perfil/perfil';
import { PanelProductor } from './panel-productor/panel-productor';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'catalogo', component: Catalogo },
  { path: 'contacto', component: Contacto },
  { path: 'detalle', component: Detalle },
  { path: 'login', component: LoginComponent },
  { path: 'productores', component: Productores },
  { path: 'registro', component: RegistroComponent },
  { path: 'perfil', component: Perfil },
  { path: 'panel-productor', component: PanelProductor },
];
