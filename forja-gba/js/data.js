/* Forja GBA — datos de referencia (nombres en español → constantes del juego). */
'use strict';
(() => {
  const F = window.F;
  F.TYPES = [
    ['NORMAL', 'Normal', '#a8a77a'], ['FIRE', 'Fuego', '#ee8130'], ['WATER', 'Agua', '#6390f0'], ['GRASS', 'Planta', '#7ac74c'],
    ['ELECTRIC', 'Eléctrico', '#f7d02c'], ['ICE', 'Hielo', '#96d9d6'], ['FIGHTING', 'Lucha', '#c22e28'], ['POISON', 'Veneno', '#a33ea1'],
    ['GROUND', 'Tierra', '#e2bf65'], ['FLYING', 'Volador', '#a98ff3'], ['PSYCHIC', 'Psíquico', '#f95587'], ['BUG', 'Bicho', '#a6b91a'],
    ['ROCK', 'Roca', '#b6a136'], ['GHOST', 'Fantasma', '#735797'], ['DRAGON', 'Dragón', '#6f35fc'], ['DARK', 'Siniestro', '#705746'],
    ['STEEL', 'Acero', '#b7b7ce'], ['FAIRY', 'Hada', '#d685ad'],
  ];
  F.typeInfo = (id) => F.TYPES.find((t) => t[0] === id);
  F.GROWTH = [['MEDIUM_FAST', 'Medio', 'Medium'], ['ERRATIC', 'Errático', 'Erratic'], ['FLUCTUATING', 'Fluctuante', 'Fluctuating'], ['MEDIUM_SLOW', 'Medio lento', 'Parabolic'], ['FAST', 'Rápido', 'Fast'], ['SLOW', 'Lento', 'Slow']];
  F.EGG_GROUPS = [['MONSTER', 'Monstruo', 'Monster'], ['WATER_1', 'Agua 1', 'Water1'], ['WATER_2', 'Agua 2', 'Water2'], ['WATER_3', 'Agua 3', 'Water3'], ['BUG', 'Bicho', 'Bug'], ['FLYING', 'Volador', 'Flying'], ['FIELD', 'Campo', 'Field'], ['FAIRY', 'Hada', 'Fairy'], ['GRASS', 'Planta', 'Grass'], ['HUMAN_LIKE', 'Humanoide', 'Humanlike'], ['MINERAL', 'Mineral', 'Mineral'], ['AMORPHOUS', 'Amorfo', 'Amorphous'], ['DRAGON', 'Dragón', 'Dragon'], ['NO_EGGS_DISCOVERED', 'Desconocido (no cría)', 'Undiscovered']];
  F.COLORS = [['RED', 'Rojo', 'Red'], ['BLUE', 'Azul', 'Blue'], ['YELLOW', 'Amarillo', 'Yellow'], ['GREEN', 'Verde', 'Green'], ['BLACK', 'Negro', 'Black'], ['BROWN', 'Café', 'Brown'], ['PURPLE', 'Morado', 'Purple'], ['GRAY', 'Gris', 'Gray'], ['WHITE', 'Blanco', 'White'], ['PINK', 'Rosa', 'Pink']];
  F.GENDERS = [[50, '50% hembras', 'Female50Percent'], [12.5, '12.5% hembras (iniciales)', 'FemaleOneEighth'], [25, '25% hembras', 'Female25Percent'], [75, '75% hembras', 'Female75Percent'], [87.5, '87.5% hembras', 'FemaleSevenEighths'], [0, 'Solo machos', 'AlwaysMale'], [100, 'Solo hembras', 'AlwaysFemale'], [-1, 'Sin género', 'Genderless']];
  F.EVO_METHODS = [['LEVEL', 'Al subir a nivel…', 'Level'], ['ITEM', 'Con una piedra / objeto', 'Item'], ['FRIENDSHIP', 'Por amistad', 'Happiness'], ['TRADE', 'Por intercambio', 'Trade']];
  F.STONES = [['FIRE_STONE', 'Piedra Fuego', 'FIRESTONE'], ['WATER_STONE', 'Piedra Agua', 'WATERSTONE'], ['THUNDER_STONE', 'Piedra Trueno', 'THUNDERSTONE'], ['LEAF_STONE', 'Piedra Hoja', 'LEAFSTONE'], ['MOON_STONE', 'Piedra Lunar', 'MOONSTONE'], ['SUN_STONE', 'Piedra Solar', 'SUNSTONE']];
  F.STATS = [['hp', 'PS', '#f25c5c'], ['atk', 'Ataque', '#f29a4a'], ['def', 'Defensa', '#f2cf4a'], ['spa', 'At. Esp.', '#6f9cf2'], ['spd', 'Def. Esp.', '#79c97a'], ['spe', 'Velocidad', '#f27fb8']];

  F.MOVES = {
    'Placaje': 'TACKLE', 'Arañazo': 'SCRATCH', 'Gruñido': 'GROWL', 'Malicioso': 'LEER', 'Látigo': 'TAIL_WHIP', 'Ascuas': 'EMBER',
    'Pistola Agua': 'WATER_GUN', 'Látigo Cepa': 'VINE_WHIP', 'Impactrueno': 'THUNDER_SHOCK', 'Ataque Rápido': 'QUICK_ATTACK', 'Mordisco': 'BITE',
    'Picotazo': 'PECK', 'Tornado': 'GUST', 'Ataque Arena': 'SAND_ATTACK', 'Burbuja': 'BUBBLE', 'Absorber': 'ABSORB', 'Megaagotar': 'MEGA_DRAIN',
    'Gigadrenado': 'GIGA_DRAIN', 'Hoja Afilada': 'RAZOR_LEAF', 'Rayo Solar': 'SOLAR_BEAM', 'Lanzallamas': 'FLAMETHROWER', 'Llamarada': 'FIRE_BLAST',
    'Rueda Fuego': 'FLAME_WHEEL', 'Colmillo Ígneo': 'FIRE_FANG', 'Hidrobomba': 'HYDRO_PUMP', 'Surf': 'SURF', 'Acua Cola': 'AQUA_TAIL', 'Cascada': 'WATERFALL',
    'Rayo Hielo': 'ICE_BEAM', 'Ventisca': 'BLIZZARD', 'Rayo': 'THUNDERBOLT', 'Trueno': 'THUNDER', 'Onda Trueno': 'THUNDER_WAVE', 'Chispa': 'SPARK',
    'Voltio Cruel': 'WILD_CHARGE', 'Psíquico': 'PSYCHIC', 'Confusión': 'CONFUSION', 'Hipnosis': 'HYPNOSIS', 'Terremoto': 'EARTHQUAKE', 'Excavar': 'DIG',
    'Avalancha': 'ROCK_SLIDE', 'Lanzarrocas': 'ROCK_THROW', 'Golpe Roca': 'ROCK_SMASH', 'Golpe Aéreo': 'AERIAL_ACE', 'Vuelo': 'FLY', 'Ala de Acero': 'STEEL_WING',
    'Cola Férrea': 'IRON_TAIL', 'Cabeza de Hierro': 'IRON_HEAD', 'Foco Resplandor': 'FLASH_CANNON', 'Garra Dragón': 'DRAGON_CLAW', 'Pulso Dragón': 'DRAGON_PULSE',
    'Bola Sombra': 'SHADOW_BALL', 'Lengüetazo': 'LICK', 'Triturar': 'CRUNCH', 'Pulso Umbrío': 'DARK_PULSE', 'Tajo Umbrío': 'NIGHT_SLASH', 'Finta': 'FEINT_ATTACK',
    'Doble Patada': 'DOUBLE_KICK', 'Patada Baja': 'LOW_KICK', 'A Bocajarro': 'CLOSE_COMBAT', 'Puño Dinámico': 'DYNAMIC_PUNCH', 'Esfera Aural': 'AURA_SPHERE',
    'Ácido': 'ACID', 'Bomba Lodo': 'SLUDGE_BOMB', 'Picotazo Veneno': 'POISON_STING', 'Somnífero': 'SLEEP_POWDER', 'Polvo Veneno': 'POISON_POWDER', 'Paralizador': 'STUN_SPORE',
    'Energibola': 'ENERGY_BALL', 'Bomba Germen': 'SEED_BOMB', 'Picadura': 'BUG_BITE', 'Tijera X': 'X_SCISSOR', 'Disparo Demora': 'STRING_SHOT',
    'Brillo Mágico': 'DAZZLING_GLEAM', 'Viento Feérico': 'FAIRY_WIND', 'Fuerza Lunar': 'MOONBLAST', 'Encanto': 'CHARM', 'Dulce Aroma': 'SWEET_SCENT',
    'Danza Espada': 'SWORDS_DANCE', 'Defensa Férrea': 'IRON_DEFENSE', 'Fortaleza': 'HARDEN', 'Protección': 'PROTECT', 'Descanso': 'REST', 'Bostezo': 'YAWN',
    'Hiperrayo': 'HYPER_BEAM', 'Golpe Cuerpo': 'BODY_SLAM', 'Doble Filo': 'DOUBLE_EDGE', 'Derribo': 'TAKE_DOWN', 'Golpe Cabeza': 'HEADBUTT', 'Cabezazo': 'SKULL_BASH', 'Rapidez': 'SWIFT',
    'Cuchillada': 'SLASH', 'Corte': 'CUT', 'Fuerza': 'STRENGTH',
  };
  F.ABILITIES = {
    'Espesura': 'OVERGROW', 'Mar Llamas': 'BLAZE', 'Torrente': 'TORRENT', 'Enjambre': 'SWARM', 'Intimidación': 'INTIMIDATE', 'Electricidad Estática': 'STATIC',
    'Pararrayos': 'LIGHTNING_ROD', 'Levitación': 'LEVITATE', 'Clorofila': 'CHLOROPHYLL', 'Nado Rápido': 'SWIFT_SWIM', 'Absorbe Agua': 'WATER_ABSORB',
    'Absorbe Fuego': 'FLASH_FIRE', 'Robustez': 'STURDY', 'Cabeza Roca': 'ROCK_HEAD', 'Agallas': 'GUTS', 'Vista Lince': 'KEEN_EYE', 'Fuga': 'RUN_AWAY',
    'Gula': 'GLUTTONY', 'Inmunidad': 'IMMUNITY', 'Cuerpo Llama': 'FLAME_BODY', 'Punto Tóxico': 'POISON_POINT', 'Sincronía': 'SYNCHRONIZE',
    'Fuerza Mental': 'INNER_FOCUS', 'Impasible': 'STEADFAST', 'Insomnio': 'INSOMNIA', 'Velo Arena': 'SAND_VEIL', 'Manto Níveo': 'SNOW_CLOAK', 'Sebo': 'THICK_FAT',
    'Ojo Compuesto': 'COMPOUND_EYES', 'Cura Natural': 'NATURAL_CURE', 'Dicha': 'SERENE_GRACE', 'Adaptable': 'ADAPTABILITY', 'Experto': 'TECHNICIAN',
    'Mudar': 'SHED_SKIN', 'Piel Tosca': 'ROUGH_SKIN', 'Potencia': 'HUGE_POWER', 'Gran Encanto': 'CUTE_CHARM', 'Presión': 'PRESSURE', 'Hidratación': 'HYDRATION',
    'Velo Agua': 'WATER_VEIL', 'Encadenado': 'SKILL_LINK', 'Afortunado': 'SUPER_LUCK', 'Francotirador': 'SNIPER', 'Rivalidad': 'RIVALRY', 'Autoestima': 'MOXIE',
    'Regeneración': 'REGENERATOR', 'Multiescamas': 'MULTISCALE', 'Bromista': 'PRANKSTER',
  };
  F.ITEMS = { 'Poción': 'POTION', 'Superpoción': 'SUPER_POTION', 'Antídoto': 'ANTIDOTE', 'Revivir': 'REVIVE', 'Poké Ball': 'POKE_BALL', 'Super Ball': 'GREAT_BALL', 'Ultra Ball': 'ULTRA_BALL', 'Caramelo Raro': 'RARE_CANDY', 'Baya Aranja': 'ORAN_BERRY', 'Piedra Fuego': 'FIRE_STONE', 'Piedra Agua': 'WATER_STONE', 'Piedra Trueno': 'THUNDER_STONE', 'Piedra Hoja': 'LEAF_STONE', 'Repelente': 'REPEL', 'Cuerda Huida': 'ESCAPE_ROPE' };

  /** "Placaje" → TACKLE; "MOVE_X" o "X_Y" se respetan; lo desconocido se convierte y se marca. */
  const lookup = (dict, text) => {
    const t = String(text || '').trim(); if (!t) return { id: '', known: true };
    if (/^[A-Z0-9_]+$/.test(t)) return { id: t.replace(/^(MOVE_|ABILITY_|ITEM_|SPECIES_)/, ''), known: true };
    const key = Object.keys(dict).find((k) => k.toLowerCase() === t.toLowerCase());
    return key ? { id: dict[key], known: true } : { id: F.constName(t), known: false };
  };
  F.moveId = (t) => lookup(F.MOVES, t);
  F.abilityId = (t) => lookup(F.ABILITIES, t);
  F.itemId = (t) => lookup(F.ITEMS, t);

  F.bstClass = (bst) =>
    bst < 300 ? 'Muy débil: primera etapa de un bicho o un ave temprana' :
    bst < 360 ? 'Primera etapa de una línea de 3 (como un inicial)' :
    bst < 440 ? 'Etapa intermedia' :
    bst < 500 ? 'Evolución final de una línea de 2 etapas' :
    bst < 550 ? 'Evolución final de una línea de 3 (inicial final)' :
    bst < 600 ? 'Muy fuerte: final no legendario' :
    bst < 680 ? 'Pseudolegendario o legendario menor' : 'Legendario';
})();
