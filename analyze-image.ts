import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function analyzeImage() {
  try {
    const zai = await ZAI.create();
    
    // Read the image file
    const imagePath = '/home/z/my-project/upload/WhatsApp Image 2026-03-29 at 22.03.27.jpeg';
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse cette image en détail et extrait TOUTES les informations visibles pour un événement:
              - Nom de l'événement
              - Date et heure
              - Lieu/Adresse
              - Prix des tickets (toutes les catégories)
              - Artistes/Participants
              - Sponsors
              - Contacts (téléphone, réseaux sociaux)
              - Toute autre information pertinente
              
              Réponds en français avec un format structuré.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    });

    console.log('=== INFORMATIONS EXTRAITES ===');
    console.log(response.choices[0]?.message?.content);
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

analyzeImage();
