import { Router } from 'express';
import { prisma, redisClient } from '../index';

const router = Router();

// WordPress API endpoints for integration

// GET /api/wordpress/dogs - Get dogs for WordPress (formatted for WP REST API)
router.get('/dogs', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.per_page as string) || 20;
    const search = req.query.search as string;
    const sex = req.query.sex as string;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (sex) {
      where.sex = sex;
    }
    
    const [dogs, total] = await Promise.all([
      prisma.dog.findMany({
        where,
        include: {
          sire: { select: { id: true, name: true } },
          dam: { select: { id: true, name: true } },
          breeder: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dog.count({ where }),
    ]);
    
    // Format for WordPress REST API standard
    const formattedDogs = dogs.map(dog => ({
      id: dog.id,
      title: { rendered: dog.name },
      content: { rendered: generateDogContent(dog) },
      excerpt: { rendered: generateDogExcerpt(dog) },
      meta: {
        registration_number: dog.registrationNumber,
        sex: dog.sex,
        birth_date: dog.birthDate,
        color: dog.color,
        weight: dog.weight,
        height: dog.height,
        hip_score: dog.hipScore,
        elbow_score: dog.elbowScore,
        sire: dog.sire,
        dam: dog.dam,
        breeder: dog.breeder,
        image_url: dog.imageUrl,
        titles: dog.titles,
      },
      date: dog.createdAt.toISOString(),
      modified: dog.updatedAt.toISOString(),
    }));
    
    res.set('X-WP-Total', total.toString());
    res.set('X-WP-TotalPages', Math.ceil(total / limit).toString());
    
    res.json(formattedDogs);
  } catch (error) {
    console.error('Error fetching dogs for WordPress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wordpress/dogs/:id - Get single dog for WordPress
router.get('/dogs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cacheKey = `wp:dog:${id}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const dog = await prisma.dog.findUnique({
      where: { id },
      include: {
        sire: {
          include: {
            sire: true,
            dam: true,
          },
        },
        dam: {
          include: {
            sire: true,
            dam: true,
          },
        },
        breeder: { select: { id: true, name: true, email: true } },
        offspringSire: {
          select: { id: true, name: true, sex: true, birthDate: true },
        },
        offspringDam: {
          select: { id: true, name: true, sex: true, birthDate: true },
        },
        healthRecords: true,
        showResults: {
          orderBy: { date: 'desc' },
        },
      },
    });
    
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    
    // Format for WordPress
    const formattedDog = {
      id: dog.id,
      title: { rendered: dog.name },
      content: { rendered: generateDetailedDogContent(dog) },
      excerpt: { rendered: generateDogExcerpt(dog) },
      meta: {
        registration_number: dog.registrationNumber,
        sex: dog.sex,
        birth_date: dog.birthDate,
        color: dog.color,
        weight: dog.weight,
        height: dog.height,
        hip_score: dog.hipScore,
        elbow_score: dog.elbowScore,
        eye_certification: dog.eyeCertification,
        sire: dog.sire,
        dam: dog.dam,
        breeder: dog.breeder,
        offspring_sire: dog.offspringSire,
        offspring_dam: dog.offspringDam,
        health_records: dog.healthRecords,
        show_results: dog.showResults,
        image_url: dog.imageUrl,
        titles: dog.titles,
        notes: dog.notes,
      },
      date: dog.createdAt.toISOString(),
      modified: dog.updatedAt.toISOString(),
    };
    
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(formattedDog));
    
    res.json(formattedDog);
  } catch (error) {
    console.error('Error fetching dog for WordPress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wordpress/pedigree/:id/:generations - Get pedigree for WordPress
router.get('/pedigree/:id/:generations?', async (req, res) => {
  try {
    const { id } = req.params;
    const generations = parseInt(req.params.generations as string) || 5;
    
    const cacheKey = `wp:pedigree:${id}:${generations}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const pedigree = await buildPedigree(id, generations);
    
    // Format for WordPress with HTML structure
    const formattedPedigree = {
      id,
      generations,
      html: generatePedigreeHTML(pedigree),
      data: pedigree,
    };
    
    await redisClient.setEx(cacheKey, 1800, JSON.stringify(formattedPedigree));
    
    res.json(formattedPedigree);
  } catch (error) {
    console.error('Error fetching pedigree for WordPress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/wordpress/search - Global search for WordPress
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    const type = req.query.type as string || 'all'; // dogs, breeders, breedings
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.per_page as string) || 20;
    
    const skip = (page - 1) * limit;
    
    let results = [];
    let total = 0;
    
    if (type === 'all' || type === 'dogs') {
      const dogs = await prisma.dog.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { registrationNumber: { contains: query, mode: 'insensitive' } },
            { color: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          sex: true,
          birthDate: true,
          imageUrl: true,
        },
        skip,
        take: limit,
      });
      
      results.push(...dogs.map(dog => ({
        type: 'dog',
        id: dog.id,
        title: dog.name,
        subtitle: dog.registrationNumber || `ID: ${dog.id}`,
        meta: dog,
      })));
    }
    
    if (type === 'all' || type === 'breeders') {
      const breeders = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        skip,
        take: limit,
      });
      
      results.push(...breeders.map(breeder => ({
        type: 'breeder',
        id: breeder.id,
        title: breeder.name || breeder.email,
        subtitle: breeder.role,
        meta: breeder,
      })));
    }
    
    total = results.length;
    
    res.set('X-WP-Total', total.toString());
    res.set('X-WP-TotalPages', Math.ceil(total / limit).toString());
    
    res.json(results);
  } catch (error) {
    console.error('Error searching for WordPress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function generateDogContent(dog: any): string {
  return `
    <div class="dog-profile">
      <h2>${dog.name}</h2>
      ${dog.imageUrl ? `<img src="${dog.imageUrl}" alt="${dog.name}" />` : ''}
      <div class="dog-info">
        <p><strong>Registration:</strong> ${dog.registrationNumber || 'N/A'}</p>
        <p><strong>Sex:</strong> ${dog.sex}</p>
        <p><strong>Birth Date:</strong> ${dog.birthDate ? new Date(dog.birthDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Color:</strong> ${dog.color || 'N/A'}</p>
        <p><strong>Weight:</strong> ${dog.weight ? `${dog.weight} kg` : 'N/A'}</p>
        <p><strong>Height:</strong> ${dog.height ? `${dog.height} cm` : 'N/A'}</p>
        ${dog.hipScore ? `<p><strong>Hip Score:</strong> <span class="health-score-${dog.hipScore <= 10 ? 'good' : dog.hipScore <= 20 ? 'fair' : 'poor'}">${dog.hipScore}</span></p>` : ''}
        ${dog.elbowScore ? `<p><strong>Elbow Score:</strong> <span class="health-score-${dog.elbowScore <= 10 ? 'good' : dog.elbowScore <= 20 ? 'fair' : 'poor'}">${dog.elbowScore}</span></p>` : ''}
        ${dog.titles.length > 0 ? `<p><strong>Titles:</strong> ${dog.titles.join(', ')}</p>` : ''}
        ${dog.sire ? `<p><strong>Sire:</strong> <a href="/dog/${dog.sire.id}">${dog.sire.name}</a></p>` : ''}
        ${dog.dam ? `<p><strong>Dam:</strong> <a href="/dog/${dog.dam.id}">${dog.dam.name}</a></p>` : ''}
        <p><strong>Breeder:</strong> ${dog.breeder.name || dog.breeder.email}</p>
        ${dog.notes ? `<p><strong>Notes:</strong> ${dog.notes}</p>` : ''}
      </div>
    </div>
  `;
}

function generateDogExcerpt(dog: any): string {
  return `${dog.name} - ${dog.sex} ${dog.registrationNumber ? `(${dog.registrationNumber})` : ''} - ${dog.color || 'Unknown color'}`;
}

function generateDetailedDogContent(dog: any): string {
  let content = generateDogContent(dog);
  
  if (dog.healthRecords.length > 0) {
    content += '<h3>Health Records</h3><ul>';
    dog.healthRecords.forEach((record: any) => {
      content += `<li><strong>${record.type}:</strong> ${record.result} (${new Date(record.date).toLocaleDateString()})</li>`;
    });
    content += '</ul>';
  }
  
  if (dog.showResults.length > 0) {
    content += '<h3>Show Results</h3><ul>';
    dog.showResults.forEach((result: any) => {
      content += `<li><strong>${result.eventName}:</strong> ${result.placement ? `${result.placement} place` : 'Participated'} (${new Date(result.date).toLocaleDateString()})</li>`;
    });
    content += '</ul>';
  }
  
  return content;
}

function generatePedigreeHTML(node: any, generation: number = 0): string {
  if (!node) return '';
  
  const indent = '  '.repeat(generation);
  let html = `${indent}<div class="pedigree-generation-${generation}">`;
  
  html += `<div class="pedigree-dog">`;
  html += `<strong>${node.name}</strong>`;
  if (node.registrationNumber) html += ` (${node.registrationNumber})`;
  html += `<br><small>${node.sex} - ${node.birthDate ? new Date(node.birthDate).getFullYear() : 'Unknown'}</small>`;
  html += `</div>`;
  
  if (node.sire || node.dam) {
    html += '<div class="pedigree-parents">';
    if (node.sire) {
      html += '<div class="pedigree-sire">';
      html += generatePedigreeHTML(node.sire, generation + 1);
      html += '</div>';
    }
    if (node.dam) {
      html += '<div class="pedigree-dam">';
      html += generatePedigreeHTML(node.dam, generation + 1);
      html += '</div>';
    }
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

async function buildPedigree(dogId: string, maxGenerations: number, currentGeneration: number = 0): Promise<any> {
  if (currentGeneration >= maxGenerations) {
    return null;
  }
  
  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    select: {
      id: true,
      name: true,
      registrationNumber: true,
      sex: true,
      birthDate: true,
      imageUrl: true,
      sireId: true,
      damId: true,
    },
  });
  
  if (!dog) {
    return null;
  }
  
  const [sire, dam] = await Promise.all([
    dog.sireId ? buildPedigree(dog.sireId, maxGenerations, currentGeneration + 1) : null,
    dog.damId ? buildPedigree(dog.damId, maxGenerations, currentGeneration + 1) : null,
  ]);
  
  return {
    id: dog.id,
    name: dog.name,
    registrationNumber: dog.registrationNumber || undefined,
    sex: dog.sex,
    birthDate: dog.birthDate || undefined,
    imageUrl: dog.imageUrl || undefined,
    sire: sire || undefined,
    dam: dam || undefined,
    generation: currentGeneration,
  };
}

export { router as wordpressRoutes };
