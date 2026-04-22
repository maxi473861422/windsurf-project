# GSD Atlas - Modelo de Base de Datos Completo

## 1. Diagrama Entidad-Relación (ERD)

### Relaciones Principales

```
┌─────────────────┐       ┌─────────────────┐
│     Users       │       │   Organizations │
│                 │       │                 │
│ - id           │◄──────│ - id           │
│ - email        │       │ - name         │
│ - name         │       │ - type         │
│ - role         │       │ - country      │
│ - created_at   │       │ - website      │
└─────────────────┘       └─────────────────┘
         │                          │
         │                          │
         │                          │
         ▼                          ▼
┌─────────────────┐       ┌─────────────────┐
│      Dogs       │───────│   Clubs         │
│                 │       │                 │
│ - id           │       │ - id           │
│ - name         │       │ - name         │
│ - sex          │       │ - code         │
│ - birth_date   │       │ - country      │
│ - sire_id      │──┐    │ - website      │
│ - dam_id       │  │    └─────────────────┘
│ - breeder_id   │  │           │
│ - current_owner│  │           │
│ - club_id      │  │           │
└─────────────────┘  │           │
         │            │           │
         │            │           │
         │            │           │
         ▼            │           ▼
┌─────────────────┐  │    ┌─────────────────┐
│   HealthRecords │  │    │   ShowResults   │
│                 │  │    │                 │
│ - id           │  │    │ - id           │
│ - dog_id       │  │    │ - dog_id       │
│ - type         │  │    │ - event_name   │
│ - result       │  │    │ - date         │
│ - date         │  │    │ - class        │
│ - certificate  │  │    │ - placement    │
└─────────────────┘  │    │ - points       │
         │            │    │ - judge        │
         │            │    └─────────────────┘
         │            │
         │            │
         ▼            │
┌─────────────────┐  │
│     Photos      │  │
│                 │  │
│ - id           │  │
│ - dog_id       │  │
│ - url          │  │
│ - is_primary   │  │
│ - caption      │  │
└─────────────────┘  │
         │            │
         │            │
         ▼            ▼
┌─────────────────────────────────┐
│      DataSources                │
│                                 │
│ - id                          │
│ - name                        │
│ - type (manual, csv, api)     │
│ - import_date                 │
│ - metadata                    │
└─────────────────────────────────┘
```

### Relaciones de Propietarios y Criadores

```
┌─────────────────┐       ┌─────────────────┐
│      Dogs       │       │  OwnersHistory │
│                 │       │                 │
│ - id           │───────│ - id           │
│ - current_owner│       │ - dog_id       │
└─────────────────┘       │ - owner_id     │
         │                │ - start_date   │
         │                │ - end_date     │
         │                │ - transfer_type│
         │                └─────────────────┘
         │                          │
         │                          │
         ▼                          ▼
┌─────────────────┐       ┌─────────────────┐
│   Breeders     │───────│  Breedings     │
│                 │       │                 │
│ - id           │       │ - id           │
│ - name         │       │ - sire_id      │
│ - kennel_name  │       │ - dam_id       │
│ - country      │       │ - breeder_id   │
└─────────────────┘       │ - date         │
         │                │ - notes        │
         │                └─────────────────┘
         │                          │
         │                          │
         ▼                          ▼
┌─────────────────┐       ┌─────────────────┐
│     Litters     │───────│   Titles       │
│                 │       │                 │
│ - id           │       │ - id           │
│ - breeding_id  │       │ - dog_id       │
│ - birth_date   │       │ - title        │
│ - puppy_count  │       │ - type         │
│ - male_count   │       │ - date         │
│ - female_count │       │ - organization │
└─────────────────┘       │ - certificate  │
         │                └─────────────────┘
         │
         ▼
┌─────────────────┐
│  LitterPuppies  │
│                 │
│ - id           │
│ - litter_id    │
│ - dog_id       │
│ - sex          │
│ - color        │
│ - weight       │
└─────────────────┘
```

## 2. Tablas Completas con Campos

### 2.1 Tablas de Usuarios y Organizaciones

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    surname VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'USER', -- USER, BREEDER, ADMIN, MODERATOR
    avatar_url TEXT,
    phone VARCHAR(50),
    country_code CHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);
```

#### organizations
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- CLUB, KENNEL, ORGANIZATION
    code VARCHAR(50) UNIQUE, -- Club registration code
    country_code CHAR(2) NOT NULL,
    region VARCHAR(100),
    website TEXT,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    logo_url TEXT,
    description TEXT,
    founded_year INTEGER,
    is_official BOOLEAN DEFAULT FALSE,
    parent_organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

#### user_organizations
```sql
CREATE TABLE user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'MEMBER', -- ADMIN, MEMBER, BREEDER
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, organization_id)
);
```

### 2.2 Tablas de Perros

#### dogs
```sql
CREATE TABLE dogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    registration_type VARCHAR(50), -- CLUB, PRIVATE, NONE
    sex CHAR(1) NOT NULL CHECK (sex IN ('M', 'F')),
    birth_date DATE,
    birth_country_code CHAR(2),
    color VARCHAR(100),
    coat_type VARCHAR(50),
    weight_kg DECIMAL(5,2),
    height_cm DECIMAL(5,2),
    chip_number VARCHAR(50) UNIQUE,
    tattoo_number VARCHAR(50),
    is_alive BOOLEAN DEFAULT TRUE,
    death_date DATE,
    death_reason VARCHAR(255),
    
    -- Genealogy
    sire_id UUID REFERENCES dogs(id),
    dam_id UUID REFERENCES dogs(id),
    
    -- Relationships
    breeder_id UUID REFERENCES breeders(id),
    current_owner_id UUID REFERENCES users(id),
    club_id UUID REFERENCES organizations(id),
    
    -- Health Scores
    hip_score DECIMAL(4,1), -- 0-100 scale
    hip_grade VARCHAR(10), -- A, B, C, D, E
    elbow_score DECIMAL(4,1), -- 0-100 scale
    elbow_grade VARCHAR(10), -- 0, 1, 2, 3
    eye_certification VARCHAR(50),
    dm_status VARCHAR(50), -- Clear, Carrier, Affected, Unknown
    
    -- Titles and achievements
    titles TEXT[], -- Array of titles
    working_titles TEXT[],
    show_titles TEXT[],
    
    -- Description and notes
    description TEXT,
    notes TEXT,
    
    -- Metadata
    data_source_id UUID REFERENCES data_sources(id),
    import_batch_id UUID,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(name, '') || ' ' || 
                   COALESCE(registration_number, '') || ' ' ||
                   COALESCE(color, '') || ' ' ||
                   COALESCE(description, ''))
    ) STORED,
    
    -- COI cache for performance
    coi_5gen DECIMAL(8,6), -- COI for 5 generations
    coi_10gen DECIMAL(8,6), -- COI for 10 generations
    coi_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Ancestry cache
    ancestor_count_5gen INTEGER DEFAULT 0,
    ancestor_count_10gen INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}'
);
```

#### breeders
```sql
CREATE TABLE breeders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    kennel_name VARCHAR(255),
    legal_name VARCHAR(255),
    registration_number VARCHAR(100),
    country_code CHAR(2) NOT NULL,
    region VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website TEXT,
    founded_year INTEGER,
    logo_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    breeding_license VARCHAR(100),
    license_expiry DATE,
    organization_id UUID REFERENCES organizations(id),
    data_source_id UUID REFERENCES data_sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

### 2.3 Tablas de Genealogía

#### breedings
```sql
CREATE TABLE breedings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sire_id UUID NOT NULL REFERENCES dogs(id),
    dam_id UUID NOT NULL REFERENCES dogs(id),
    breeder_id UUID NOT NULL REFERENCES breeders(id),
    breeding_date DATE NOT NULL,
    mating_type VARCHAR(50) DEFAULT 'NATURAL', -- NATURAL, AI, EMBRYO
    notes TEXT,
    is_successful BOOLEAN,
    success_notes TEXT,
    data_source_id UUID REFERENCES data_sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    CHECK (sire_id != dam_id)
);
```

#### litters
```sql
CREATE TABLE litters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breeding_id UUID NOT NULL REFERENCES breedings(id) UNIQUE,
    birth_date DATE NOT NULL,
    puppy_count INTEGER NOT NULL,
    male_count INTEGER NOT NULL,
    female_count INTEGER NOT NULL,
    stillborn_count INTEGER DEFAULT 0,
    notes TEXT,
    data_source_id UUID REFERENCES data_sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

#### litter_puppies
```sql
CREATE TABLE litter_puppies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    litter_id UUID NOT NULL REFERENCES litters(id) ON DELETE CASCADE,
    dog_id UUID REFERENCES dogs(id) ON DELETE SET NULL,
    sex CHAR(1) NOT NULL CHECK (sex IN ('M', 'F')),
    birth_weight_grams INTEGER,
    color VARCHAR(100),
    coat_type VARCHAR(50),
    markings TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(litter_id, dog_id)
);
```

#### ownership_history
```sql
CREATE TABLE ownership_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id),
    breeder_id UUID REFERENCES breeders(id),
    start_date DATE NOT NULL,
    end_date DATE,
    transfer_type VARCHAR(50) DEFAULT 'SALE', -- SALE, GIFT, BREEDING, INHERITANCE
    transfer_price DECIMAL(10,2),
    notes TEXT,
    documents TEXT[], -- Array of document URLs
    data_source_id UUID REFERENCES data_sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

### 2.4 Tablas de Salud

#### health_records
```sql
CREATE TABLE health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- HIP_DYSPLASIA, ELBOW_DYSPLASIA, DM, EYES, HEART, DNA
    result VARCHAR(50) NOT NULL, -- NORMAL, AFFECTED, CARRIER, SUSPECT
    score DECIMAL(4,1),
    grade VARCHAR(10),
    test_date DATE NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    veterinarian_name VARCHAR(255),
    clinic_name VARCHAR(255),
    certificate_number VARCHAR(100),
    certificate_url TEXT,
    notes TEXT,
    data_source_id UUID REFERENCES data_sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

#### dna_tests
```sql
CREATE TABLE dna_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    test_type VARCHAR(50) NOT NULL, -- DM, HEMOPHILIA, VWD, etc.
    result VARCHAR(50) NOT NULL, -- CLEAR, CARRIER, AFFECTED
    laboratory VARCHAR(255),
    test_date DATE NOT NULL,
    certificate_number VARCHAR(100),
    certificate_url TEXT,
    notes TEXT,
    data_source_id UUID REFERENCES data_sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

### 2.5 Tablas de Shows y Títulos

#### show_results
```sql
CREATE TABLE show_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50), -- CONFORMATION, WORKING, AGILITY, OBEDIENCE
    event_date DATE NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    judge_name VARCHAR(255),
    class VARCHAR(100),
    placement INTEGER,
    points DECIMAL(5,2),
    title_earned VARCHAR(255),
    certificate_url TEXT,
    notes TEXT,
    data_source_id UUID REFERENCES data_sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

#### titles
```sql
CREATE TABLE titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    title_type VARCHAR(50) NOT NULL, -- BEAUTY, WORKING, CHAMPIONSHIP
    organization_id UUID REFERENCES organizations(id),
    earned_date DATE NOT NULL,
    certificate_number VARCHAR(100),
    certificate_url TEXT,
    is_international BOOLEAN DEFAULT FALSE,
    notes TEXT,
    data_source_id UUID REFERENCES data_sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dog_id, title, organization_id)
);
```

### 2.6 Tablas de Fotografías

#### photos
```sql
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    photographer_name VARCHAR(255),
    photographer_credit TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    photo_date DATE,
    location VARCHAR(255),
    file_size_bytes INTEGER,
    dimensions VARCHAR(20), -- "1920x1080"
    mime_type VARCHAR(50),
    storage_provider VARCHAR(50), -- S3, CLOUDINARY, LOCAL
    storage_path TEXT,
    data_source_id UUID REFERENCES data_sources(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

### 2.7 Tablas de Fuentes de Datos

#### data_sources
```sql
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- MANUAL, CSV, API, SCRAPING, IMPORT
    description TEXT,
    url TEXT,
    api_endpoint TEXT,
    credentials_encrypted TEXT,
    import_frequency VARCHAR(50), -- DAILY, WEEKLY, MONTHLY, ONCE
    last_import_at TIMESTAMP WITH TIME ZONE,
    next_import_at TIMESTAMP WITH TIME ZONE,
    import_status VARCHAR(50), -- ACTIVE, PAUSED, ERROR, COMPLETED
    total_records_imported INTEGER DEFAULT 0,
    total_records_failed INTEGER DEFAULT 0,
    last_error_message TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

#### import_batches
```sql
CREATE TABLE import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id),
    batch_name VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED, PARTIAL
    total_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_summary JSONB,
    created_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'
);
```

#### import_logs
```sql
CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_batch_id UUID NOT NULL REFERENCES import_batches(id),
    record_type VARCHAR(50), -- DOG, BREEDING, HEALTH, SHOW
    record_id UUID,
    action VARCHAR(50), -- CREATE, UPDATE, SKIP, ERROR
    status VARCHAR(50) DEFAULT 'SUCCESS', -- SUCCESS, ERROR, WARNING
    error_message TEXT,
    original_data JSONB,
    processed_data JSONB,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.8 Tablas de Auditoría

#### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### data_versioning
```sql
CREATE TABLE data_versioning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    data JSONB NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_reason TEXT,
    metadata JSONB DEFAULT '{}',
    UNIQUE(table_name, record_id, version_number)
);
```

### 2.9 Tablas de Caché y Optimización

#### pedigree_cache
```sql
CREATE TABLE pedigree_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id),
    generations INTEGER NOT NULL,
    pedigree_data JSONB NOT NULL,
    html_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(dog_id, generations)
);
```

#### coi_cache
```sql
CREATE TABLE coi_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id),
    generations INTEGER NOT NULL,
    coi_value DECIMAL(8,6) NOT NULL,
    common_ancestors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(dog_id, generations)
);
```

#### descendant_stats
```sql
CREATE TABLE descendant_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id),
    generation INTEGER NOT NULL,
    total_descendants INTEGER DEFAULT 0,
    male_descendants INTEGER DEFAULT 0,
    female_descendants INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dog_id, generation)
);
```

## 3. Índices Recomendados

### 3.1 Índices Básicos

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_country ON users(country_code);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Organizations
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_country ON organizations(country_code);
CREATE INDEX idx_organizations_parent ON organizations(parent_organization_id);

-- Dogs (Critical for performance)
CREATE INDEX idx_dogs_name ON dogs(name);
CREATE INDEX idx_dogs_registration ON dogs(registration_number);
CREATE INDEX idx_dogs_sex ON dogs(sex);
CREATE INDEX idx_dogs_birth_date ON dogs(birth_date);
CREATE INDEX idx_dogs_sire ON dogs(sire_id);
CREATE INDEX idx_dogs_dam ON dogs(dam_id);
CREATE INDEX idx_dogs_breeder ON dogs(breeder_id);
CREATE INDEX idx_dogs_owner ON dogs(current_owner_id);
CREATE INDEX idx_dogs_club ON dogs(club_id);
CREATE INDEX idx_dogs_chip ON dogs(chip_number);
CREATE INDEX idx_dogs_alive ON dogs(is_alive);
CREATE INDEX idx_dogs_search ON dogs USING GIN(search_vector);
CREATE INDEX idx_dogs_metadata ON dogs USING GIN(metadata);

-- Breeders
CREATE INDEX idx_breeders_user ON breeders(user_id);
CREATE INDEX idx_breeders_country ON breeders(country_code);
CREATE INDEX idx_breeders_kennel ON breeders(kennel_name);
CREATE INDEX idx_breeders_active ON breeders(is_active);
```

### 3.2 Índices Compuestos

```sql
-- Dogs complex queries
CREATE INDEX idx_dogs_sex_birth ON dogs(sex, birth_date DESC);
CREATE INDEX idx_dogs_breeder_sex ON dogs(breeder_id, sex);
CREATE INDEX idx_dogs_club_type ON dogs(club_id, registration_type);
CREATE INDEX idx_dogs_country_sex ON dogs(birth_country_code, sex);

-- Genealogy queries
CREATE INDEX idx_dogs_sire_dam ON dogs(sire_id, dam_id);
CREATE INDEX idx_dogs_sire_birth ON dogs(sire_id, birth_date DESC);
CREATE INDEX idx_dogs_dam_birth ON dogs(dam_id, birth_date DESC);

-- Health records
CREATE INDEX idx_health_dog_type ON health_records(dog_id, type);
CREATE INDEX idx_health_type_date ON health_records(type, test_date DESC);
CREATE INDEX idx_health_result ON health_records(result);

-- Show results
CREATE INDEX idx_show_dog_date ON show_results(dog_id, event_date DESC);
CREATE INDEX idx_show_event_type ON show_results(event_type, event_date DESC);
CREATE INDEX idx_show_org_date ON show_results(organization_id, event_date DESC);

-- Ownership
CREATE INDEX idx_ownership_dog_date ON ownership_history(dog_id, start_date DESC);
CREATE INDEX idx_ownership_owner_date ON ownership_history(owner_id, start_date DESC);
```

### 3.3 Índices Parciales

```sql
-- Only alive dogs for most queries
CREATE INDEX idx_dogs_alive_birth ON dogs(birth_date DESC) WHERE is_alive = TRUE;
CREATE INDEX idx_dogs_alive_sire ON dogs(sire_id) WHERE is_alive = TRUE;
CREATE INDEX idx_dogs_alive_dam ON dogs(dam_id) WHERE is_alive = TRUE;

-- Only verified dogs
CREATE INDEX idx_dogs_verified ON dogs(is_verified) WHERE is_verified = TRUE;

-- Recent imports
CREATE INDEX idx_import_batches_recent ON import_batches(started_at DESC) WHERE status = 'COMPLETED';
```

## 4. Estrategia para Optimizar Consultas Recursivas

### 4.1 Materialized Path Pattern

```sql
-- Add materialized path to dogs table
ALTER TABLE dogs ADD COLUMN lineage_path TEXT;
ALTER TABLE dogs ADD COLUMN lineage_depth INTEGER DEFAULT 0;

-- Trigger to maintain lineage path
CREATE OR REPLACE FUNCTION update_lineage_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sire_id IS NOT NULL THEN
        NEW.lineage_path = (SELECT COALESCE(lineage_path, id::TEXT) || '/' || NEW.id::TEXT FROM dogs WHERE id = NEW.sire_id);
        NEW.lineage_depth = (SELECT COALESCE(lineage_depth, 0) + 1 FROM dogs WHERE id = NEW.sire_id);
    ELSIF NEW.dam_id IS NOT NULL THEN
        NEW.lineage_path = (SELECT COALESCE(lineage_path, id::TEXT) || '/' || NEW.id::TEXT FROM dogs WHERE id = NEW.dam_id);
        NEW.lineage_depth = (SELECT COALESCE(lineage_depth, 0) + 1 FROM dogs WHERE id = NEW.dam_id);
    ELSE
        NEW.lineage_path = NEW.id::TEXT;
        NEW.lineage_depth = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lineage_path
    BEFORE INSERT OR UPDATE ON dogs
    FOR EACH ROW
    EXECUTE FUNCTION update_lineage_path();

-- Index for lineage queries
CREATE INDEX idx_dogs_lineage_path ON dogs USING GIN(to_tsvector('simple', lineage_path));
```

### 4.2 Closure Table Pattern

```sql
-- Closure table for ancestor relationships
CREATE TABLE dog_ancestors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ancestor_id UUID NOT NULL REFERENCES dogs(id),
    descendant_id UUID NOT NULL REFERENCES dogs(id),
    depth INTEGER NOT NULL,
    path_type VARCHAR(10) NOT NULL, -- SIRE, DAM
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ancestor_id, descendant_id, depth, path_type)
);

-- Indexes for closure table
CREATE INDEX idx_ancestors_ancestor ON dog_ancestors(ancestor_id);
CREATE INDEX idx_ancestors_descendant ON dog_ancestors(descendant_id);
CREATE INDEX idx_ancestors_depth ON dog_ancestors(depth);
CREATE INDEX idx_ancestors_path_type ON dog_ancestors(path_type);

-- Function to maintain closure table
CREATE OR REPLACE FUNCTION update_dog_ancestors()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete existing ancestor relationships
    DELETE FROM dog_ancestors WHERE descendant_id = NEW.id;
    
    -- Add sire ancestors
    IF NEW.sire_id IS NOT NULL THEN
        INSERT INTO dog_ancestors (ancestor_id, descendant_id, depth, path_type)
        SELECT ancestor_id, NEW.id, depth + 1, 'SIRE'
        FROM dog_ancestors WHERE descendant_id = NEW.sire_id
        UNION
        SELECT NEW.sire_id, NEW.id, 1, 'SIRE';
    END IF;
    
    -- Add dam ancestors
    IF NEW.dam_id IS NOT NULL THEN
        INSERT INTO dog_ancestors (ancestor_id, descendant_id, depth, path_type)
        SELECT ancestor_id, NEW.id, depth + 1, 'DAM'
        FROM dog_ancestors WHERE descendant_id = NEW.dam_id
        UNION
        SELECT NEW.dam_id, NEW.id, 1, 'DAM';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dog_ancestors
    AFTER INSERT OR UPDATE ON dogs
    FOR EACH ROW
    EXECUTE FUNCTION update_dog_ancestors();
```

### 4.3 Recursive CTE Optimization

```sql
-- Optimized pedigree query using closure table
CREATE OR REPLACE FUNCTION get_pedigree_closure(p_dog_id UUID, p_max_generations INTEGER DEFAULT 5)
RETURNS TABLE (
    generation INTEGER,
    dog_id UUID,
    name VARCHAR(255),
    sex CHAR(1),
    sire_id UUID,
    dam_id UUID,
    path_type VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE pedigree AS (
        -- Base case: the dog itself
        SELECT 
            0 as generation,
            d.id as dog_id,
            d.name,
            d.sex,
            d.sire_id,
            d.dam_id,
            'SELF' as path_type
        FROM dogs d
        WHERE d.id = p_dog_id
        
        UNION ALL
        
        -- Recursive case: get parents
        SELECT 
            p.generation + 1,
            CASE 
                WHEN p.generation % 2 = 0 THEN 
                    (SELECT sire_id FROM dogs WHERE id = p.dog_id)
                ELSE 
                    (SELECT dam_id FROM dogs WHERE id = p.dog_id)
            END,
            d.name,
            d.sex,
            d.sire_id,
            d.dam_id,
            CASE 
                WHEN p.generation % 2 = 0 THEN 'SIRE'
                ELSE 'DAM'
            END
        FROM pedigree p
        JOIN dogs d ON (
            CASE 
                WHEN p.generation % 2 = 0 THEN d.id = p.sire_id
                ELSE d.id = p.dam_id
            END
        )
        WHERE p.generation < p_max_generations
        AND (p.sire_id IS NOT NULL OR p.dam_id IS NOT NULL)
    )
    SELECT * FROM pedigree ORDER BY generation, dog_id;
END;
$$ LANGUAGE plpgsql;
```

### 4.4 Precomputed Statistics

```sql
-- Function to calculate descendant statistics
CREATE OR REPLACE FUNCTION calculate_descendant_stats(p_dog_id UUID)
RETURNS VOID AS $$
DECLARE
    v_generation INTEGER;
BEGIN
    -- Clear existing stats
    DELETE FROM descendant_stats WHERE dog_id = p_dog_id;
    
    -- Calculate for each generation
    FOR v_generation IN 1..10 LOOP
        INSERT INTO descendant_stats (dog_id, generation, total_descendants, male_descendants, female_descendants)
        SELECT 
            p_dog_id,
            v_generation,
            COUNT(*),
            SUM(CASE WHEN sex = 'M' THEN 1 ELSE 0 END),
            SUM(CASE WHEN sex = 'F' THEN 1 ELSE 0 END)
        FROM dog_ancestors da
        JOIN dogs d ON da.descendant_id = d.id
        WHERE da.ancestor_id = p_dog_id
        AND da.depth = v_generation;
    END LOOP;
    
    -- Update timestamp
    UPDATE descendant_stats 
    SET last_calculated_at = NOW() 
    WHERE dog_id = p_dog_id;
END;
$$ LANGUAGE plpgsql;
```

## 5. Preparación para Millones de Registros

### 5.1 Partitioning Strategy

```sql
-- Partition dogs by birth year
CREATE TABLE dogs_partitioned (
    id UUID,
    name VARCHAR(255),
    registration_number VARCHAR(100),
    sex CHAR(1),
    birth_date DATE,
    -- ... other fields
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) PARTITION BY RANGE (birth_date);

-- Create partitions
CREATE TABLE dogs_1990_1999 PARTITION OF dogs_partitioned
    FOR VALUES FROM ('1990-01-01') TO ('2000-01-01');

CREATE TABLE dogs_2000_2009 PARTITION OF dogs_partitioned
    FOR VALUES FROM ('2000-01-01') TO ('2010-01-01');

CREATE TABLE dogs_2010_2019 PARTITION OF dogs_partitioned
    FOR VALUES FROM ('2010-01-01') TO ('2020-01-01');

CREATE TABLE dogs_2020_2029 PARTITION OF dogs_partitioned
    FOR VALUES FROM ('2020-01-01') TO ('2030-01-01');

CREATE TABLE dogs_future PARTITION OF dogs_partitioned
    DEFAULT;
```

### 5.2 Sharding Strategy

```sql
-- Shard by region/country
CREATE TABLE dogs_shard_america (LIKE dogs INCLUDING ALL);
CREATE TABLE dogs_shard_europe (LIKE dogs INCLUDING ALL);
CREATE TABLE dogs_shard_asia (LIKE dogs INCLUDING ALL);
CREATE TABLE dogs_shard_other (LIKE dogs INCLUDING ALL);

-- Router function
CREATE OR REPLACE FUNCTION get_dog_shard(p_country_code CHAR(2))
RETURNS TEXT AS $$
BEGIN
    CASE p_country_code
        WHEN 'US', 'CA', 'MX', 'BR', 'AR' THEN RETURN 'dogs_shard_america';
        WHEN 'DE', 'GB', 'FR', 'ES', 'IT', 'NL' THEN RETURN 'dogs_shard_europe';
        WHEN 'CN', 'JP', 'KR', 'IN', 'AU' THEN RETURN 'dogs_shard_asia';
        ELSE RETURN 'dogs_shard_other';
    END CASE;
END;
$$ LANGUAGE plpgsql;
```

### 5.3 Connection Pooling

```sql
-- Configure connection pool in application layer
-- Recommended settings for millions of records:
-- - Min connections: 10
-- - Max connections: 100
-- - Idle timeout: 10 minutes
-- - Connection lifetime: 1 hour
```

### 5.4 Read Replicas

```sql
-- Set up read replicas for reporting and analytics
-- Primary: Write operations
-- Replica 1: Read operations (pedigree queries)
-- Replica 2: Analytics (statistics, reporting)
-- Replica 3: Backup
```

## 6. Sistema de Versionado y Auditoría

### 6.1 Audit Triggers

```sql
-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values,
        changed_fields,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        current_setting('app.current_user_id', TRUE)::UUID,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        CASE 
            WHEN TG_OP = 'UPDATE' THEN 
                array_agg(quote_ident(attname)) 
            ELSE NULL 
        END,
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_dogs
    AFTER INSERT OR UPDATE OR DELETE ON dogs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_breedings
    AFTER INSERT OR UPDATE OR DELETE ON breedings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_health_records
    AFTER INSERT OR UPDATE OR DELETE ON health_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

### 6.2 Data Versioning

```sql
-- Versioning trigger function
CREATE OR REPLACE FUNCTION version_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_version INTEGER;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Get current version number
        SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version
        FROM data_versioning
        WHERE table_name = TG_TABLE_NAME AND record_id = NEW.id;
        
        -- Insert new version
        INSERT INTO data_versioning (
            table_name,
            record_id,
            version_number,
            data,
            changed_by,
            changed_at,
            change_reason
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            v_version,
            row_to_json(NEW),
            current_setting('app.current_user_id', TRUE)::UUID,
            NOW(),
            current_setting('app.change_reason', TRUE)
        );
    ELSIF TG_OP = 'INSERT' THEN
        -- Insert first version
        INSERT INTO data_versioning (
            table_name,
            record_id,
            version_number,
            data,
            changed_by,
            changed_at
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            1,
            row_to_json(NEW),
            current_setting('app.current_user_id', TRUE)::UUID,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply versioning to critical tables
CREATE TRIGGER version_dogs
    AFTER INSERT OR UPDATE ON dogs
    FOR EACH ROW EXECUTE FUNCTION version_trigger();

CREATE TRIGGER version_breedings
    AFTER INSERT OR UPDATE ON breedings
    FOR EACH ROW EXECUTE FUNCTION version_trigger();
```

### 6.3 Soft Delete Pattern

```sql
-- Add soft delete to important tables
ALTER TABLE dogs ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE breedings ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE health_records ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Index for soft delete queries
CREATE INDEX idx_dogs_deleted ON dogs(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_breedings_deleted ON breedings(deleted_at) WHERE deleted_at IS NOT NULL;

-- Function to soft delete
CREATE OR REPLACE FUNCTION soft_delete_dog(p_dog_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE dogs 
    SET deleted_at = NOW() 
    WHERE id = p_dog_id AND deleted_at IS NULL;
    
    -- Cascade soft delete to related records
    UPDATE breedings 
    SET deleted_at = NOW() 
    WHERE (sire_id = p_dog_id OR dam_id = p_dog_id) AND deleted_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

## 7. Optimizaciones Específicas para Genealogía

### 7.1 COI Calculation Optimization

```sql
-- Precomputed COI relationships
CREATE TABLE coi_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id),
    ancestor_id UUID NOT NULL REFERENCES dogs(id),
    contribution DECIMAL(10,8) NOT NULL,
    path_count INTEGER NOT NULL,
    generations INTEGER NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dog_id, ancestor_id, generations)
);

CREATE INDEX idx_coi_dog ON coi_relationships(dog_id);
CREATE INDEX idx_coi_ancestor ON coi_relationships(ancestor_id);
CREATE INDEX idx_coi_contributions ON coi_relationships(contribution DESC);

-- Function to calculate and cache COI
CREATE OR REPLACE FUNCTION calculate_and_cache_coi(p_dog_id UUID, p_generations INTEGER DEFAULT 5)
RETURNS DECIMAL(8,6) AS $$
DECLARE
    v_coi DECIMAL(8,6);
BEGIN
    -- Clear existing calculations
    DELETE FROM coi_relationships WHERE dog_id = p_dog_id;
    
    -- Calculate COI using closure table
    WITH ancestor_paths AS (
        SELECT 
            a1.ancestor_id,
            a1.depth as depth1,
            a2.depth as depth2,
            a1.path_type as path1,
            a2.path_type as path2
        FROM dog_ancestors a1
        JOIN dog_ancestors a2 ON a1.ancestor_id = a2.ancestor_id
        WHERE a1.descendant_id = p_dog_id 
        AND a2.descendant_id = p_dog_id
        AND a1.depth < p_generations
        AND a2.depth < p_generations
        AND a1.path_type != a2.path_type  -- Different paths (sire/dam)
    ),
    coi_calculations AS (
        SELECT 
            ancestor_id,
            SUM(POWER(0.5, depth1 + depth2 + 1)) as contribution
        FROM ancestor_paths
        GROUP BY ancestor_id
    )
    SELECT SUM(contribution) INTO v_coi FROM coi_calculations;
    
    -- Cache results
    INSERT INTO coi_relationships (dog_id, ancestor_id, contribution, path_count, generations)
    SELECT 
        p_dog_id,
        ancestor_id,
        contribution,
        1, -- Simplified path count
        p_generations
    FROM coi_calculations;
    
    -- Update dogs table cache
    UPDATE dogs 
    SET coi_5gen = v_coi,
        coi_updated_at = NOW()
    WHERE id = p_dog_id;
    
    RETURN v_coi;
END;
$$ LANGUAGE plpgsql;
```

### 7.2 Common Ancestors Detection

```sql
-- Precomputed common ancestors
CREATE TABLE common_ancestors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog1_id UUID NOT NULL REFERENCES dogs(id),
    dog2_id UUID NOT NULL REFERENCES dogs(id),
    ancestor_id UUID NOT NULL REFERENCES dogs(id),
    contribution DECIMAL(10,8) NOT NULL,
    generations INTEGER NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dog1_id, dog2_id, ancestor_id)
);

CREATE INDEX idx_common_dog1 ON common_ancestors(dog1_id);
CREATE INDEX idx_common_dog2 ON common_ancestors(dog2_id);
CREATE INDEX idx_common_ancestor ON common_ancestors(ancestor_id);

-- Function to find common ancestors
CREATE OR REPLACE FUNCTION find_common_ancestors(p_dog1_id UUID, p_dog2_id UUID)
RETURNS TABLE (
    ancestor_id UUID,
    ancestor_name VARCHAR(255),
    contribution DECIMAL(10,8),
    generations INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        da.ancestor_id,
        d.name as ancestor_name,
        SUM(POWER(0.5, da.depth + da2.depth + 1)) as contribution,
        GREATEST(da.depth, da2.depth) as generations
    FROM dog_ancestors da
    JOIN dog_ancestors da2 ON da.ancestor_id = da2.ancestor_id
    JOIN dogs d ON da.ancestor_id = d.id
    WHERE da.descendant_id = p_dog1_id
    AND da2.descendant_id = p_dog2_id
    AND da.depth <= 10
    AND da2.depth <= 10
    GROUP BY da.ancestor_id, d.name
    ORDER BY contribution DESC;
END;
$$ LANGUAGE plpgsql;
```

### 7.3 Linebreeding Analysis

```sql
-- Linebreeding statistics
CREATE TABLE linebreeding_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dog_id UUID NOT NULL REFERENCES dogs(id),
    ancestor_id UUID NOT NULL REFERENCES dogs(id),
    percentage_in_pedigree DECIMAL(5,2), -- % of blood
    occurrence_count INTEGER NOT NULL,
    max_generation INTEGER NOT NULL,
    min_generation INTEGER NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dog_id, ancestor_id)
);

-- Function to calculate linebreeding
CREATE OR REPLACE FUNCTION calculate_linebreeding(p_dog_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Clear existing stats
    DELETE FROM linebreeding_stats WHERE dog_id = p_dog_id;
    
    -- Calculate linebreeding statistics
    INSERT INTO linebreeding_stats (dog_id, ancestor_id, percentage_in_pedigree, occurrence_count, max_generation, min_generation)
    SELECT 
        p_dog_id,
        ancestor_id,
        SUM(POWER(0.5, depth)) * 100 as percentage_in_pedigree,
        COUNT(*) as occurrence_count,
        MAX(depth) as max_generation,
        MIN(depth) as min_generation
    FROM dog_ancestors
    WHERE descendant_id = p_dog_id
    AND depth <= 10
    GROUP BY ancestor_id
    HAVING COUNT(*) > 1; -- Only ancestors appearing multiple times
END;
$$ LANGUAGE plpgsql;
```

## 8. Mantenimiento y Optimización Continua

### 8.1 Vacuum y Analyze

```sql
-- Schedule regular vacuum and analyze
-- Recommended: Weekly for high-traffic tables
VACUUM ANALYZE dogs;
VACUUM ANALYZE dog_ancestors;
VACUUM ANALYZE health_records;
VACUUM ANALYZE show_results;
```

### 8.2 Reindexing

```sql
-- Reindex fragmented indexes
REINDEX INDEX CONCURRENTLY idx_dogs_name;
REINDEX INDEX CONCURRENTLY idx_dogs_sire;
REINDEX INDEX CONCURRENTLY idx_dogs_dam;
```

### 8.3 Statistics Update

```sql
-- Update table statistics
ANALYZE dogs;
ANALYZE breedings;
ANALYZE health_records;
```

Este diseño de base de datos está optimizado para:
- Escalabilidad a millones de registros
- Consultas genealógicas complejas y recursivas
- Auditoría completa de cambios
- Alto rendimiento con caching inteligente
- Flexibilidad para futuras expansiones
