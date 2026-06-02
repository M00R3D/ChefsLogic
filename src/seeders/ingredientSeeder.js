/**
 * ingredientSeeder.js
 * Inserta ingredientes base representativos de la cocina mexicana.
 * Upsert idempotente; llena campos legacy y modernos.
 * Uso: node src/seeders/ingredientSeeder.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Ingredient = require('../models/Ingredient');
const User = require('../models/User');

const INGREDIENTS = [
  { nombre: 'Sal de mar', name: 'Sal de mar', categoria: 'condimento', category: 'condimento', cantidad: 1000, unidad: 'g', defaultUnit: 'g', accesibilidad: 'economico', tags: ['base','sal'] },
  { nombre: 'Pimienta negra', name: 'Pimienta negra', categoria: 'especia', category: 'especia', cantidad: 250, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['especia','base'] },
  { nombre: 'Comino', name: 'Comino', categoria: 'especia', category: 'especia', cantidad: 200, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['especia'] },
  { nombre: 'Orégano mexicano', name: 'Orégano mexicano', categoria: 'especia', category: 'especia', cantidad: 150, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['especia','hierbas'] },
  { nombre: 'Canela', name: 'Canela', categoria: 'especia', category: 'especia', cantidad: 200, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['especia','dulce'] },
  { nombre: 'Clavo', name: 'Clavo', categoria: 'especia', category: 'especia', cantidad: 100, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['especia'] },
  { nombre: 'Laurel', name: 'Laurel', categoria: 'especia', category: 'especia', cantidad: 100, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['hierbas'] },
  { nombre: 'Achiote', name: 'Achiote', categoria: 'especia', category: 'especia', cantidad: 200, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['sureste','condimento'] },
  { nombre: 'Hoja santa', name: 'Hoja santa', categoria: 'verdura', category: 'verdura', cantidad: 1, unidad: 'manojo', defaultUnit: 'manojo', accesibilidad: 'medio', tags: ['sur','hierbas'] },
  { nombre: 'Epazote', name: 'Epazote', categoria: 'verdura', category: 'verdura', cantidad: 1, unidad: 'manojo', defaultUnit: 'manojo', accesibilidad: 'medio', tags: ['hierbas'] },

  { nombre: 'Maíz blanco', name: 'Maíz blanco', categoria: 'grano', category: 'grano', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['base','masa'] },
  { nombre: 'Masa de maíz', name: 'Masa de maíz', categoria: 'grano', category: 'grano', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['masa','tortilla'] },
  { nombre: 'Harina de maíz nixtamalizada', name: 'Harina de maíz nixtamalizada', categoria: 'grano', category: 'grano', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['masa'] },
  { nombre: 'Tortilla de maíz', name: 'Tortilla de maíz', categoria: 'grano', category: 'grano', cantidad: 24, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['tortilla','base'] },
  { nombre: 'Arroz', name: 'Arroz', categoria: 'grano', category: 'grano', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['base'] },
  { nombre: 'Frijol negro', name: 'Frijol negro', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['legumbre'] },
  { nombre: 'Frijol bayo', name: 'Frijol bayo', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['legumbre'] },
  { nombre: 'Frijol pinto', name: 'Frijol pinto', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['legumbre'] },
  { nombre: 'Lenteja', name: 'Lenteja', categoria: 'proteina', category: 'proteina', cantidad: 1, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'economico', tags: ['legumbre'] },

  { nombre: 'Tomate', name: 'Tomate', categoria: 'verdura', category: 'verdura', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['base','salsa'] },
  { nombre: 'Tomatillo', name: 'Tomatillo', categoria: 'verdura', category: 'verdura', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['salsa'] },
  { nombre: 'Cebolla blanca', name: 'Cebolla blanca', categoria: 'verdura', category: 'verdura', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['base'] },
  { nombre: 'Cebolla morada', name: 'Cebolla morada', categoria: 'verdura', category: 'verdura', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['encurtido'] },
  { nombre: 'Ajo', name: 'Ajo', categoria: 'verdura', category: 'verdura', cantidad: 500, unidad: 'g', defaultUnit: 'diente', accesibilidad: 'medio', tags: ['base'] },
  { nombre: 'Zanahoria', name: 'Zanahoria', categoria: 'verdura', category: 'verdura', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['caldos'] },
  { nombre: 'Papa', name: 'Papa', categoria: 'verdura', category: 'verdura', cantidad: 3, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'economico', tags: ['base'] },
  { nombre: 'Calabacita', name: 'Calabacita', categoria: 'verdura', category: 'verdura', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['verdura'] },
  { nombre: 'Chayote', name: 'Chayote', categoria: 'verdura', category: 'verdura', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['caldos'] },
  { nombre: 'Ejote', name: 'Ejote', categoria: 'verdura', category: 'verdura', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['verdura'] },
  { nombre: 'Nopal', name: 'Nopal', categoria: 'verdura', category: 'verdura', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['nopal'] },
  { nombre: 'Elote', name: 'Elote', categoria: 'verdura', category: 'verdura', cantidad: 20, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['maiz'] },
  { nombre: 'Cilantro', name: 'Cilantro', categoria: 'verdura', category: 'verdura', cantidad: 3, unidad: 'manojo', defaultUnit: 'manojo', accesibilidad: 'medio', tags: ['hierbas'] },
  { nombre: 'Perejil', name: 'Perejil', categoria: 'verdura', category: 'verdura', cantidad: 3, unidad: 'manojo', defaultUnit: 'manojo', accesibilidad: 'medio', tags: ['hierbas'] },
  { nombre: 'Lechuga romana', name: 'Lechuga romana', categoria: 'verdura', category: 'verdura', cantidad: 8, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['ensalada'] },
  { nombre: 'Repollo', name: 'Repollo', categoria: 'verdura', category: 'verdura', cantidad: 6, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['ensalada'] },

  { nombre: 'Limón', name: 'Limón', categoria: 'fruta', category: 'fruta', cantidad: 2, unidad: 'kg', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['citrico'] },
  { nombre: 'Naranja agria', name: 'Naranja agria', categoria: 'fruta', category: 'fruta', cantidad: 1, unidad: 'kg', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['yucatan'] },
  { nombre: 'Aguacate hass', name: 'Aguacate hass', categoria: 'fruta', category: 'fruta', cantidad: 2, unidad: 'kg', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['guacamole'] },
  { nombre: 'Piña', name: 'Piña', categoria: 'fruta', category: 'fruta', cantidad: 4, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['tropical'] },
  { nombre: 'Mango', name: 'Mango', categoria: 'fruta', category: 'fruta', cantidad: 2, unidad: 'kg', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['tropical'] },
  { nombre: 'Tamarindo', name: 'Tamarindo', categoria: 'fruta', category: 'fruta', cantidad: 1, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['dulce','bebida'] },
  { nombre: 'Guayaba', name: 'Guayaba', categoria: 'fruta', category: 'fruta', cantidad: 1, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['postres'] },
  { nombre: 'Plátano macho', name: 'Plátano macho', categoria: 'fruta', category: 'fruta', cantidad: 20, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['sur'] },

  { nombre: 'Chile ancho', name: 'Chile ancho', categoria: 'chile', category: 'chile', cantidad: 500, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['seco'] },
  { nombre: 'Chile guajillo', name: 'Chile guajillo', categoria: 'chile', category: 'chile', cantidad: 500, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['seco'] },
  { nombre: 'Chile pasilla', name: 'Chile pasilla', categoria: 'chile', category: 'chile', cantidad: 500, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['seco'] },
  { nombre: 'Chile de árbol', name: 'Chile de árbol', categoria: 'chile', category: 'chile', cantidad: 500, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['picante'] },
  { nombre: 'Chile chipotle', name: 'Chile chipotle', categoria: 'chile', category: 'chile', cantidad: 400, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['ahumado'] },
  { nombre: 'Chile morita', name: 'Chile morita', categoria: 'chile', category: 'chile', cantidad: 300, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['ahumado'] },
  { nombre: 'Chile serrano', name: 'Chile serrano', categoria: 'chile', category: 'chile', cantidad: 500, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['fresco'] },
  { nombre: 'Chile jalapeño', name: 'Chile jalapeño', categoria: 'chile', category: 'chile', cantidad: 500, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['fresco'] },
  { nombre: 'Chile poblano', name: 'Chile poblano', categoria: 'chile', category: 'chile', cantidad: 500, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['relleno'] },
  { nombre: 'Chile habanero', name: 'Chile habanero', categoria: 'chile', category: 'chile', cantidad: 300, unidad: 'g', defaultUnit: 'g', accesibilidad: 'premium', tags: ['yucatan','picante'] },

  { nombre: 'Carne de res', name: 'Carne de res', categoria: 'proteina', category: 'proteina', cantidad: 3, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['res'] },
  { nombre: 'Pulpa de cerdo', name: 'Pulpa de cerdo', categoria: 'proteina', category: 'proteina', cantidad: 3, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['cerdo'] },
  { nombre: 'Costilla de cerdo', name: 'Costilla de cerdo', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['cerdo'] },
  { nombre: 'Pollo entero', name: 'Pollo entero', categoria: 'proteina', category: 'proteina', cantidad: 4, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['pollo'] },
  { nombre: 'Pechuga de pollo', name: 'Pechuga de pollo', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['pollo'] },
  { nombre: 'Pescado blanco', name: 'Pescado blanco', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['costa'] },
  { nombre: 'Atún fresco', name: 'Atún fresco', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'premium', tags: ['mariscos'] },
  { nombre: 'Camarón', name: 'Camarón', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'premium', tags: ['mariscos'] },
  { nombre: 'Pulpo', name: 'Pulpo', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'premium', tags: ['mariscos'] },
  { nombre: 'Jaiba', name: 'Jaiba', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'premium', tags: ['mariscos'] },
  { nombre: 'Quesillo oaxaqueño', name: 'Quesillo oaxaqueño', categoria: 'lacteo', category: 'lacteo', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['queso'] },
  { nombre: 'Queso fresco', name: 'Queso fresco', categoria: 'lacteo', category: 'lacteo', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['queso'] },
  { nombre: 'Panela', name: 'Panela', categoria: 'lacteo', category: 'lacteo', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['queso'] },
  { nombre: 'Crema mexicana', name: 'Crema mexicana', categoria: 'lacteo', category: 'lacteo', cantidad: 2, unidad: 'l', defaultUnit: 'ml', accesibilidad: 'medio', tags: ['lacteo'] },

  { nombre: 'Aceite vegetal', name: 'Aceite vegetal', categoria: 'aceite', category: 'aceite', cantidad: 5, unidad: 'l', defaultUnit: 'ml', accesibilidad: 'medio', tags: ['base'] },
  { nombre: 'Aceite de oliva', name: 'Aceite de oliva', categoria: 'aceite', category: 'aceite', cantidad: 3, unidad: 'l', defaultUnit: 'ml', accesibilidad: 'premium', tags: ['ensalada'] },
  { nombre: 'Manteca de cerdo', name: 'Manteca de cerdo', categoria: 'aceite', category: 'aceite', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['tradicional'] },
  { nombre: 'Vinagre blanco', name: 'Vinagre blanco', categoria: 'condimento', category: 'condimento', cantidad: 2, unidad: 'l', defaultUnit: 'ml', accesibilidad: 'medio', tags: ['encurtido'] },
  { nombre: 'Vinagre de manzana', name: 'Vinagre de manzana', categoria: 'condimento', category: 'condimento', cantidad: 2, unidad: 'l', defaultUnit: 'ml', accesibilidad: 'medio', tags: ['aderezo'] },
  { nombre: 'Salsa inglesa', name: 'Salsa inglesa', categoria: 'salsa', category: 'salsa', cantidad: 10, unidad: 'botella', defaultUnit: 'ml', accesibilidad: 'medio', tags: ['condimento'] },
  { nombre: 'Salsa de soya', name: 'Salsa de soya', categoria: 'salsa', category: 'salsa', cantidad: 10, unidad: 'botella', defaultUnit: 'ml', accesibilidad: 'medio', tags: ['condimento'] },
  { nombre: 'Mayonesa', name: 'Mayonesa', categoria: 'salsa', category: 'salsa', cantidad: 10, unidad: 'botella', defaultUnit: 'ml', accesibilidad: 'medio', tags: ['aderezo'] },
  { nombre: 'Mostaza', name: 'Mostaza', categoria: 'salsa', category: 'salsa', cantidad: 10, unidad: 'botella', defaultUnit: 'ml', accesibilidad: 'medio', tags: ['aderezo'] },

  { nombre: 'Chocolate de mesa', name: 'Chocolate de mesa', categoria: 'otro', category: 'otro', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['mole','postres'] },
  { nombre: 'Cacao en polvo', name: 'Cacao en polvo', categoria: 'otro', category: 'otro', cantidad: 1, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['postres'] },
  { nombre: 'Piloncillo', name: 'Piloncillo', categoria: 'otro', category: 'otro', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['dulce'] },
  { nombre: 'Azúcar', name: 'Azúcar', categoria: 'otro', category: 'otro', cantidad: 4, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'economico', tags: ['dulce'] },
  { nombre: 'Miel de abeja', name: 'Miel de abeja', categoria: 'otro', category: 'otro', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['dulce'] },
  { nombre: 'Vainilla', name: 'Vainilla', categoria: 'especia', category: 'especia', cantidad: 500, unidad: 'ml', defaultUnit: 'ml', accesibilidad: 'premium', tags: ['postres'] },

  { nombre: 'Hoja de plátano', name: 'Hoja de plátano', categoria: 'otro', category: 'otro', cantidad: 50, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['sur','tamal'] },
  { nombre: 'Hoja de maíz', name: 'Hoja de maíz', categoria: 'otro', category: 'otro', cantidad: 100, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['tamal'] },
  { nombre: 'Semilla de calabaza', name: 'Semilla de calabaza', categoria: 'grano', category: 'grano', cantidad: 1, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['pepita','sureste'] },
  { nombre: 'Ajonjolí', name: 'Ajonjolí', categoria: 'grano', category: 'grano', cantidad: 1, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['mole'] },
  { nombre: 'Cacahuate', name: 'Cacahuate', categoria: 'grano', category: 'grano', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['botana','salsa'] },
  { nombre: 'Almendra', name: 'Almendra', categoria: 'grano', category: 'grano', cantidad: 1, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'premium', tags: ['mole'] },
  { nombre: 'Pasas', name: 'Pasas', categoria: 'fruta', category: 'fruta', cantidad: 1, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['mole','dulce'] },
  { nombre: 'Tortilla de harina', name: 'Tortilla de harina', categoria: 'grano', category: 'grano', cantidad: 24, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['norte'] },
  { nombre: 'Harina de trigo', name: 'Harina de trigo', categoria: 'grano', category: 'grano', cantidad: 3, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['panaderia'] },
  { nombre: 'Levadura seca', name: 'Levadura seca', categoria: 'condimento', category: 'condimento', cantidad: 500, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['panaderia'] },

  { nombre: 'Champiñón', name: 'Champiñón', categoria: 'hongo', category: 'hongo', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['hongo'] },
  { nombre: 'Seta', name: 'Seta', categoria: 'hongo', category: 'hongo', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['hongo'] },
  { nombre: 'Flor de calabaza', name: 'Flor de calabaza', categoria: 'verdura', category: 'verdura', cantidad: 30, unidad: 'manojo', defaultUnit: 'manojo', accesibilidad: 'medio', tags: ['regional'] },
  { nombre: 'Huitlacoche', name: 'Huitlacoche', categoria: 'hongo', category: 'hongo', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'premium', tags: ['maiz','regional'] },
  { nombre: 'Chorizo', name: 'Chorizo', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['embutido'] },
  { nombre: 'Longaniza', name: 'Longaniza', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['embutido'] },
  { nombre: 'Tocino', name: 'Tocino', categoria: 'proteina', category: 'proteina', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['embutido'] },
  { nombre: 'Huevos', name: 'Huevos', categoria: 'proteina', category: 'proteina', cantidad: 120, unidad: 'pieza', defaultUnit: 'pieza', accesibilidad: 'medio', tags: ['desayuno'] },
  { nombre: 'Leche entera', name: 'Leche entera', categoria: 'lacteo', category: 'lacteo', cantidad: 10, unidad: 'l', defaultUnit: 'ml', accesibilidad: 'medio', tags: ['lacteo'] },
  { nombre: 'Mantequilla', name: 'Mantequilla', categoria: 'lacteo', category: 'lacteo', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['coccion'] },

  { nombre: 'Agua mineral', name: 'Agua mineral', categoria: 'bebida', category: 'bebida', cantidad: 20, unidad: 'botella', defaultUnit: 'ml', accesibilidad: 'medio', tags: ['bebida'] },
  { nombre: 'Café molido', name: 'Café molido', categoria: 'bebida', category: 'bebida', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['bebida'] },
  { nombre: 'Canela en rama', name: 'Canela en rama', categoria: 'bebida', category: 'bebida', cantidad: 500, unidad: 'g', defaultUnit: 'g', accesibilidad: 'medio', tags: ['atole'] },
  { nombre: 'Arroz para horchata', name: 'Arroz para horchata', categoria: 'bebida', category: 'bebida', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['horchata'] },
  { nombre: 'Jamaica seca', name: 'Jamaica seca', categoria: 'bebida', category: 'bebida', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['agua-fresca'] },
  { nombre: 'Tamarindo seco', name: 'Tamarindo seco', categoria: 'bebida', category: 'bebida', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['agua-fresca'] },

  { nombre: 'Frijol ayocote', name: 'Frijol ayocote', categoria: 'proteina', category: 'proteina', cantidad: 1, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['regional'] },
  { nombre: 'Quelites', name: 'Quelites', categoria: 'verdura', category: 'verdura', cantidad: 30, unidad: 'manojo', defaultUnit: 'manojo', accesibilidad: 'medio', tags: ['regional'] },
  { nombre: 'Pápalo', name: 'Pápalo', categoria: 'verdura', category: 'verdura', cantidad: 20, unidad: 'manojo', defaultUnit: 'manojo', accesibilidad: 'medio', tags: ['regional'] },
  { nombre: 'Chaya', name: 'Chaya', categoria: 'verdura', category: 'verdura', cantidad: 20, unidad: 'manojo', defaultUnit: 'manojo', accesibilidad: 'medio', tags: ['sureste'] },
  { nombre: 'Xoconostle', name: 'Xoconostle', categoria: 'fruta', category: 'fruta', cantidad: 2, unidad: 'kg', defaultUnit: 'g', accesibilidad: 'medio', tags: ['regional'] }
];

function findByNameQuery(doc) {
  return { $or: [ { name: doc.name }, { nombre: doc.nombre } ] };
}

async function seedIngredients() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chefslogic';
  console.log('Seeder de ingredientes: conectando a', uri);
  await mongoose.connect(uri);

  let user = await User.findOne({ $or: [{ email: 'seeder@chefslogic.local' }, { correo: 'seeder@chefslogic.local' }] });
  if (!user) {
    const passwordHash = await bcrypt.hash('changeme123', 12);
    user = await User.create({
      name: 'Seeder User',
      email: 'seeder@chefslogic.local',
      passwordHash,
      nombre: 'Seeder User',
      correo: 'seeder@chefslogic.local',
      password: passwordHash,
      rol: 'usuario',
      role: 'usuario',
      avatar: 'default.png',
      fecha_registro: new Date(),
      permissions: {
        canModerateIngredients: false,
        canDeleteAnyDocument: false,
        canApproveUserContent: false
      }
    });
    console.log('  Usuario seeder creado:', user.email);
  }

  let inserted = 0;
  let updated = 0;

  for (const doc of INGREDIENTS) {
    const payload = Object.assign({}, doc, {
      createdBy: user._id,
      sourceType: 'seed',
      approvalStatus: 'approved',
      isPublic: true,
      approvedBy: user._id,
      approvedAt: new Date(),
      name: doc.name,
      nombre: doc.nombre,
      category: doc.category || doc.categoria || 'otro',
      categoria: doc.categoria || doc.category || 'otro',
      defaultUnit: doc.defaultUnit || doc.unidad || 'g',
      precio_aprox: Number(doc.precio_aprox || 0)
    });

    const existing = await Ingredient.findOne(findByNameQuery(payload));
    if (existing) {
      existing.set(payload);
      await existing.save();
      updated++;
      console.log('  ↻ Actualizado:', payload.name);
    } else {
      await Ingredient.create(payload);
      inserted++;
      console.log('  ✔ Insertado:', payload.name);
    }
  }

  console.log(`\nResumen: insertados=${inserted}, actualizados=${updated}`);
  await mongoose.disconnect();
  process.exit(0);
}

seedIngredients().catch((err) => {
  console.error('ERROR en ingredientSeeder:', err.message || err);
  process.exit(1);
});
