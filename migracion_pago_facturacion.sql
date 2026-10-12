ALTER TABLE `pagos`
  ADD COLUMN `id_facturacion` bigint(20) UNSIGNED DEFAULT NULL AFTER `id_operacion`,
  ADD KEY `idx_pago_facturacion` (`id_facturacion`),
  ADD CONSTRAINT `fk_pago_facturacion`
    FOREIGN KEY (`id_facturacion`)
    REFERENCES `datos_facturacion` (`id_facturacion`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;