CREATE TABLE IF NOT EXISTS `contenidos_educativos` (
  `id_contenido` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `titulo` varchar(180) NOT NULL,
  `descripcion` text NOT NULL,
  `categoria` varchar(80) NOT NULL,
  `tipo` varchar(80) NOT NULL,
  `imagen` varchar(180) NOT NULL,
  `video` varchar(255) DEFAULT NULL,
  `id_usuario_creador` bigint(20) UNSIGNED NOT NULL,
  `estado` varchar(16) NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_contenido`),
  KEY `fk_contenido_creador` (`id_usuario_creador`),
  KEY `idx_contenido_estado_fecha` (`estado`,`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
