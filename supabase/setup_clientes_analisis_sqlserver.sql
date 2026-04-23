/*
  Stain the Canvas - Analisis de clientes anonimo (SQL Server)
  Script 2 para ejecutar en SQL Server (T-SQL).
  No guarda PII: sin nombre, correo, telefono o direccion.
*/

SET NOCOUNT ON;
GO

/* =========================================================
   0) Crear base de datos desde cero
   ========================================================= */
IF DB_ID(N'StainTheCanvasAnalytics') IS NULL
BEGIN
  CREATE DATABASE [StainTheCanvasAnalytics];
END;
GO

USE [StainTheCanvasAnalytics];
GO

/* =========================================================
   0.1) Tabla minima de productos (solo si no existe)
   - Permite correr el analisis desde cero.
   - Si ya tienes una tabla productos completa, esta se omite.
   ========================================================= */
IF OBJECT_ID('dbo.productos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.productos (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_productos PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(200) NOT NULL,
    categoria NVARCHAR(120) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_productos_created_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

/* =========================================================
   1) Catalogos normalizados
   ========================================================= */
IF OBJECT_ID('dbo.fuentes_trafico', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.fuentes_trafico (
    id SMALLINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    codigo NVARCHAR(50) NOT NULL UNIQUE,
    nombre NVARCHAR(100) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_fuentes_trafico_created_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

IF OBJECT_ID('dbo.tipos_evento_cliente', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tipos_evento_cliente (
    id SMALLINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    codigo NVARCHAR(50) NOT NULL UNIQUE,
    descripcion NVARCHAR(200) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_tipos_evento_cliente_created_at DEFAULT SYSUTCDATETIME()
  );
END;
GO

/* =========================================================
   2) Sesiones anonimas y eventos anonimos
   ========================================================= */
IF OBJECT_ID('dbo.sesiones_cliente_anonimas', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.sesiones_cliente_anonimas (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_sesiones_cliente_anonimas PRIMARY KEY DEFAULT NEWID(),
    session_id NVARCHAR(128) NOT NULL,
    fuente_id SMALLINT NULL,
    landing_path NVARCHAR(300) NULL,
    user_agent NVARCHAR(500) NULL,
    first_seen_at DATETIME2(3) NOT NULL CONSTRAINT DF_sesiones_cliente_anonimas_first_seen_at DEFAULT SYSUTCDATETIME(),
    last_seen_at DATETIME2(3) NOT NULL CONSTRAINT DF_sesiones_cliente_anonimas_last_seen_at DEFAULT SYSUTCDATETIME(),
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_sesiones_cliente_anonimas_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_sesiones_cliente_anonimas_session_id UNIQUE (session_id),
    CONSTRAINT FK_sesiones_cliente_anonimas_fuente_id
      FOREIGN KEY (fuente_id) REFERENCES dbo.fuentes_trafico(id),
    CONSTRAINT CK_sesiones_cliente_anonimas_session_id_len
      CHECK (LEN(LTRIM(RTRIM(ISNULL(session_id, N'')))) BETWEEN 16 AND 128)
  );
END;
GO

IF OBJECT_ID('dbo.eventos_cliente_anonimos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.eventos_cliente_anonimos (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_eventos_cliente_anonimos PRIMARY KEY DEFAULT NEWID(),
    sesion_id UNIQUEIDENTIFIER NOT NULL,
    tipo_evento_id SMALLINT NOT NULL,
    producto_id UNIQUEIDENTIFIER NULL,
    categoria NVARCHAR(80) NULL,
    meta NVARCHAR(MAX) NOT NULL CONSTRAINT DF_eventos_cliente_anonimos_meta DEFAULT N'{}',
    fecha DATETIME2(3) NOT NULL CONSTRAINT DF_eventos_cliente_anonimos_fecha DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_eventos_cliente_anonimos_sesion_id
      FOREIGN KEY (sesion_id) REFERENCES dbo.sesiones_cliente_anonimas(id) ON DELETE CASCADE,
    CONSTRAINT FK_eventos_cliente_anonimos_tipo_evento_id
      FOREIGN KEY (tipo_evento_id) REFERENCES dbo.tipos_evento_cliente(id),
    CONSTRAINT CK_eventos_cliente_anonimos_categoria_len
      CHECK (LEN(ISNULL(categoria, N'')) <= 80),
    CONSTRAINT CK_eventos_cliente_anonimos_meta_json
      CHECK (ISJSON(meta) = 1)
  );
END;
GO

/* FK opcional a productos si existe la tabla */
IF OBJECT_ID('dbo.productos', 'U') IS NOT NULL
AND NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_eventos_cliente_anonimos_producto_id'
)
BEGIN
  ALTER TABLE dbo.eventos_cliente_anonimos
  ADD CONSTRAINT FK_eventos_cliente_anonimos_producto_id
  FOREIGN KEY (producto_id) REFERENCES dbo.productos(id);
END;
GO

/* =========================================================
   3) Indices
   ========================================================= */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_fuentes_trafico_codigo' AND object_id = OBJECT_ID('dbo.fuentes_trafico'))
  CREATE INDEX IX_fuentes_trafico_codigo ON dbo.fuentes_trafico(codigo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tipos_evento_cliente_codigo' AND object_id = OBJECT_ID('dbo.tipos_evento_cliente'))
  CREATE INDEX IX_tipos_evento_cliente_codigo ON dbo.tipos_evento_cliente(codigo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_sesiones_cliente_anonimas_first_seen_at' AND object_id = OBJECT_ID('dbo.sesiones_cliente_anonimas'))
  CREATE INDEX IX_sesiones_cliente_anonimas_first_seen_at ON dbo.sesiones_cliente_anonimas(first_seen_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_sesiones_cliente_anonimas_last_seen_at' AND object_id = OBJECT_ID('dbo.sesiones_cliente_anonimas'))
  CREATE INDEX IX_sesiones_cliente_anonimas_last_seen_at ON dbo.sesiones_cliente_anonimas(last_seen_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_eventos_cliente_anonimos_sesion_id' AND object_id = OBJECT_ID('dbo.eventos_cliente_anonimos'))
  CREATE INDEX IX_eventos_cliente_anonimos_sesion_id ON dbo.eventos_cliente_anonimos(sesion_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_eventos_cliente_anonimos_tipo_fecha' AND object_id = OBJECT_ID('dbo.eventos_cliente_anonimos'))
  CREATE INDEX IX_eventos_cliente_anonimos_tipo_fecha ON dbo.eventos_cliente_anonimos(tipo_evento_id, fecha DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_eventos_cliente_anonimos_producto_id' AND object_id = OBJECT_ID('dbo.eventos_cliente_anonimos'))
  CREATE INDEX IX_eventos_cliente_anonimos_producto_id ON dbo.eventos_cliente_anonimos(producto_id);
GO

/* =========================================================
   4) Seed base
   ========================================================= */
MERGE dbo.fuentes_trafico AS tgt
USING (
  SELECT N'directo' AS codigo, N'Directo' AS nombre UNION ALL
  SELECT N'instagram', N'Instagram' UNION ALL
  SELECT N'facebook', N'Facebook' UNION ALL
  SELECT N'whatsapp', N'WhatsApp' UNION ALL
  SELECT N'referido', N'Referido' UNION ALL
  SELECT N'otro', N'Otro'
) AS src
ON tgt.codigo = src.codigo
WHEN NOT MATCHED THEN
  INSERT (codigo, nombre) VALUES (src.codigo, src.nombre);
GO

MERGE dbo.tipos_evento_cliente AS tgt
USING (
  SELECT N'view_producto' AS codigo, N'Visualizacion de producto' AS descripcion UNION ALL
  SELECT N'click_whatsapp', N'Clic al boton de WhatsApp'
) AS src
ON tgt.codigo = src.codigo
WHEN NOT MATCHED THEN
  INSERT (codigo, descripcion) VALUES (src.codigo, src.descripcion);
GO

/* =========================================================
   5) Trigger: al insertar evento, toca last_seen_at de sesion
   ========================================================= */
CREATE OR ALTER TRIGGER dbo.trg_touch_sesion_last_seen
ON dbo.eventos_cliente_anonimos
AFTER INSERT
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE s
  SET s.last_seen_at = CASE WHEN i.max_fecha > s.last_seen_at THEN i.max_fecha ELSE s.last_seen_at END
  FROM dbo.sesiones_cliente_anonimas s
  INNER JOIN (
    SELECT sesion_id, MAX(fecha) AS max_fecha
    FROM inserted
    GROUP BY sesion_id
  ) i ON i.sesion_id = s.id;
END;
GO

/* =========================================================
   6) SP tracking anonimo (upsert sesion + valida + inserta evento)
   ========================================================= */
CREATE OR ALTER PROCEDURE dbo.sp_track_evento_cliente_anonimo
  @session_id NVARCHAR(128),
  @tipo_evento_codigo NVARCHAR(50),
  @producto_id UNIQUEIDENTIFIER = NULL,
  @categoria NVARCHAR(80) = NULL,
  @user_agent NVARCHAR(500) = NULL,
  @fuente_codigo NVARCHAR(50) = N'directo',
  @landing_path NVARCHAR(300) = NULL,
  @meta NVARCHAR(MAX) = N'{}'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @now DATETIME2(3) = SYSUTCDATETIME();
  DECLARE @session_trim NVARCHAR(128) = LTRIM(RTRIM(ISNULL(@session_id, N'')));
  DECLARE @tipo_trim NVARCHAR(50) = LOWER(LTRIM(RTRIM(ISNULL(@tipo_evento_codigo, N''))));
  DECLARE @fuente_trim NVARCHAR(50) = LOWER(LTRIM(RTRIM(ISNULL(@fuente_codigo, N'directo'))));

  IF LEN(@session_trim) < 16 OR LEN(@session_trim) > 128
    THROW 51000, 'session_id invalido.', 1;

  IF ISJSON(ISNULL(@meta, N'{}')) <> 1
    THROW 51000, 'meta debe ser JSON valido.', 1;

  DECLARE @fuente_id SMALLINT;
  DECLARE @tipo_evento_id SMALLINT;
  DECLARE @sesion_uuid UNIQUEIDENTIFIER;

  SELECT TOP (1) @fuente_id = id
  FROM dbo.fuentes_trafico
  WHERE codigo = @fuente_trim;

  IF @fuente_id IS NULL
  BEGIN
    SELECT TOP (1) @fuente_id = id
    FROM dbo.fuentes_trafico
    WHERE codigo = N'otro';
  END;

  SELECT TOP (1) @tipo_evento_id = id
  FROM dbo.tipos_evento_cliente
  WHERE codigo = @tipo_trim;

  IF @tipo_evento_id IS NULL
    THROW 51000, 'tipo_evento no permitido.', 1;

  BEGIN TRANSACTION;

    MERGE dbo.sesiones_cliente_anonimas WITH (HOLDLOCK) AS tgt
    USING (
      SELECT
        @session_trim AS session_id,
        @fuente_id AS fuente_id,
        NULLIF(LEFT(ISNULL(@landing_path, N''), 300), N'') AS landing_path,
        NULLIF(LEFT(ISNULL(@user_agent, N''), 500), N'') AS user_agent,
        @now AS now_utc
    ) AS src
    ON tgt.session_id = src.session_id
    WHEN MATCHED THEN
      UPDATE SET
        tgt.fuente_id = ISNULL(tgt.fuente_id, src.fuente_id),
        tgt.landing_path = ISNULL(tgt.landing_path, src.landing_path),
        tgt.user_agent = ISNULL(tgt.user_agent, src.user_agent),
        tgt.last_seen_at = src.now_utc
    WHEN NOT MATCHED THEN
      INSERT (session_id, fuente_id, landing_path, user_agent, first_seen_at, last_seen_at, created_at)
      VALUES (src.session_id, src.fuente_id, src.landing_path, src.user_agent, src.now_utc, src.now_utc, src.now_utc);

    SELECT TOP (1) @sesion_uuid = id
    FROM dbo.sesiones_cliente_anonimas
    WHERE session_id = @session_trim;

    /* Dedupe: mismo tipo + mismo producto en los ultimos 8 segundos */
    IF EXISTS (
      SELECT 1
      FROM dbo.eventos_cliente_anonimos e
      WHERE e.sesion_id = @sesion_uuid
        AND e.tipo_evento_id = @tipo_evento_id
        AND ISNULL(CONVERT(NVARCHAR(36), e.producto_id), N'') = ISNULL(CONVERT(NVARCHAR(36), @producto_id), N'')
        AND e.fecha > DATEADD(SECOND, -8, @now)
    )
    BEGIN
      COMMIT TRANSACTION;
      RETURN;
    END;

    /* Rate limit: max 60 eventos por minuto por sesion */
    IF (
      SELECT COUNT(*)
      FROM dbo.eventos_cliente_anonimos e
      WHERE e.sesion_id = @sesion_uuid
        AND e.fecha > DATEADD(MINUTE, -1, @now)
    ) >= 60
    BEGIN
      COMMIT TRANSACTION;
      RETURN;
    END;

    INSERT INTO dbo.eventos_cliente_anonimos (
      sesion_id,
      tipo_evento_id,
      producto_id,
      categoria,
      meta,
      fecha
    )
    VALUES (
      @sesion_uuid,
      @tipo_evento_id,
      @producto_id,
      NULLIF(LEFT(ISNULL(@categoria, N''), 80), N''),
      ISNULL(@meta, N'{}'),
      @now
    );

  COMMIT TRANSACTION;
END;
GO

/* =========================================================
   7) SP metricas dashboard anonimo (retorna JSON)
   ========================================================= */
CREATE OR ALTER PROCEDURE dbo.sp_get_clientes_anon_dashboard_metrics
  @days INT = 90
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @safe_days INT = CASE
    WHEN @days IS NULL OR @days < 1 THEN 90
    WHEN @days > 3650 THEN 3650
    ELSE @days
  END;

  DECLARE @cutoff DATETIME2(3) = DATEADD(DAY, -@safe_days, SYSUTCDATETIME());

  ;WITH sesiones_src AS (
    SELECT s.*
    FROM dbo.sesiones_cliente_anonimas s
    WHERE s.first_seen_at >= @cutoff OR s.last_seen_at >= @cutoff
  ),
  eventos_src AS (
    SELECT e.*, te.codigo AS tipo_codigo
    FROM dbo.eventos_cliente_anonimos e
    INNER JOIN dbo.tipos_evento_cliente te ON te.id = e.tipo_evento_id
    WHERE e.fecha >= @cutoff
  ),
  totals AS (
    SELECT
      (SELECT COUNT(*) FROM sesiones_src) AS totalSesiones,
      (SELECT COUNT(*) FROM eventos_src WHERE tipo_codigo = N'view_producto') AS totalVistasProducto,
      (SELECT COUNT(*) FROM eventos_src WHERE tipo_codigo = N'click_whatsapp') AS totalClicksWhatsapp
  )
  SELECT
    metrics_json = (
      SELECT
        (
          SELECT
            t.totalSesiones,
            t.totalVistasProducto,
            t.totalClicksWhatsapp,
            CAST(
              CASE WHEN t.totalVistasProducto > 0
                THEN ROUND((1.0 * t.totalClicksWhatsapp / t.totalVistasProducto) * 100.0, 1)
                ELSE 0
              END
              AS DECIMAL(10,1)
            ) AS conversionWhatsapp
          FROM totals t
          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) AS totals,
        JSON_QUERY(
          (
            SELECT
              CONVERT(VARCHAR(10), CAST(s.first_seen_at AS DATE), 23) AS [day],
              COUNT(*) AS total
            FROM sesiones_src s
            GROUP BY CAST(s.first_seen_at AS DATE)
            ORDER BY [day]
            FOR JSON PATH
          )
        ) AS sessionsSeries,
        JSON_QUERY(
          (
            SELECT
              ISNULL(f.nombre, N'Sin fuente') AS fuente,
              COUNT(*) AS total
            FROM sesiones_src s
            LEFT JOIN dbo.fuentes_trafico f ON f.id = s.fuente_id
            GROUP BY ISNULL(f.nombre, N'Sin fuente')
            ORDER BY total DESC
            FOR JSON PATH
          )
        ) AS bySource,
        JSON_QUERY(
          (
            SELECT TOP (10)
              e.producto_id AS id,
              ISNULL(p.nombre, CONCAT(N'Producto ', LEFT(CONVERT(NVARCHAR(36), e.producto_id), 8))) AS nombre,
              ISNULL(NULLIF(p.categoria, N''), ISNULL(NULLIF(e.categoria, N''), N'Sin categoria')) AS categoria,
              COUNT(*) AS vistas
            FROM eventos_src e
            LEFT JOIN dbo.productos p ON p.id = e.producto_id
            WHERE e.tipo_codigo = N'view_producto'
              AND e.producto_id IS NOT NULL
            GROUP BY
              e.producto_id,
              ISNULL(p.nombre, CONCAT(N'Producto ', LEFT(CONVERT(NVARCHAR(36), e.producto_id), 8))),
              ISNULL(NULLIF(p.categoria, N''), ISNULL(NULLIF(e.categoria, N''), N'Sin categoria'))
            ORDER BY COUNT(*) DESC
            FOR JSON PATH
          )
        ) AS topProducts,
        JSON_QUERY(
          (
            SELECT
              ISNULL(NULLIF(p.categoria, N''), ISNULL(NULLIF(e.categoria, N''), N'Sin categoria')) AS categoria,
              COUNT(*) AS total
            FROM eventos_src e
            LEFT JOIN dbo.productos p ON p.id = e.producto_id
            WHERE e.tipo_codigo = N'view_producto'
            GROUP BY ISNULL(NULLIF(p.categoria, N''), ISNULL(NULLIF(e.categoria, N''), N'Sin categoria'))
            ORDER BY total DESC
            FOR JSON PATH
          )
        ) AS byCategory
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );
END;
GO

/* =========================================================
   8) Ejemplos de uso
   =========================================================

EXEC dbo.sp_track_evento_cliente_anonimo
  @session_id = N'stc-1234567890abcdef',
  @tipo_evento_codigo = N'view_producto',
  @producto_id = NULL,
  @categoria = N'Pinturas',
  @user_agent = N'Mozilla/5.0',
  @fuente_codigo = N'instagram',
  @landing_path = N'/catalogo.html',
  @meta = N'{"from":"home"}';

EXEC dbo.sp_get_clientes_anon_dashboard_metrics @days = 90;

*/
