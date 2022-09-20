1. Mueve todo lo que esta en src de tu libreria al src de este repo.
2. Agrega las librerías que necesites al package.json y luego npm install.
3. Anda a components.js e importa todos los componentes que quieres exportar a tu nueva librería
4. Cambia el name en package.json al nombre que quieres utilizar
5. Haz npm run build
6. Listo, ahora puedes instalar con npm install path/a/esta/carpeta o subirlo a npm.

Chao pescao.


Para importarlo después en tu app puedes hacer

import 'vue-2to3/dist/library.css'
import { TuComponente } from 'vue-2to3'

Atentamente Flair. /GoFlair