import { supabase } from '../config/supabase.js';

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array The array to shuffle.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
}

/**
 * Finds doctors specializing in Endometriosis in a specific city, fetches all,
 * then selects up to 3 random unique doctors from the results.
 * @param {string} city - The city to search within (case-insensitive).
 * @returns {Promise<object[] | null>} Array of up to 3 unique doctor/clinic info objects, or null on error.
 */
export async function findDoctorsByCity(city) {
  if (!city || typeof city !== 'string') {
    console.error("[Doctor Service] Invalid city provided:", city);
    return null;
  }

  const normalizedCity = city.trim();
  console.log(`[Doctor Service] Searching all doctors via clinics in city: ${normalizedCity}`);

  try {
    // Fetch all clinics in the city and their associated doctors
    const { data: results, error } = await supabase
      .from('clinics')
      .select(`
        city,
        name,
        phone_number,
        email,
        doctors!inner (
          id,
          name,
          phone_number,
          email,
          specialty
        )
      `)
      .ilike('city', normalizedCity); // Filter clinics by city

    if (error) {
      console.error(`[Doctor Service] Error fetching doctors/clinics for "${normalizedCity}":`, error);
      throw error; // Rethrow Supabase error
    }

    if (!results || results.length === 0) {
      console.log(`[Doctor Service] No clinics/doctors found for city "${normalizedCity}".`);
      return [];
    }

    // --- Process Results In-App ---

    // 1. Extract all doctor-clinic associations
    const allDoctorClinicAssociations = results.flatMap(clinic =>
        clinic.doctors.map(doctor => ({
            ...doctor,
            clinic_name: clinic.name,
            clinic_city: clinic.city
        }))
    );

    // 2. Get unique doctors using a Map (keyed by doctor ID)
    const uniqueDoctorsMap = new Map();
    allDoctorClinicAssociations.forEach(assoc => {
        if (!uniqueDoctorsMap.has(assoc.id)) {
            // Store the first encountered full doctor details
            uniqueDoctorsMap.set(assoc.id, {
                id: assoc.id,
                name: assoc.name,
                phone_number: assoc.phone_number,
                email: assoc.email,
                specialty: assoc.specialty
                // No need to store clinic info here, just unique doctor info
            });
        }
    });

    let selectedDoctorIds = Array.from(uniqueDoctorsMap.keys());
    const uniqueDoctorCount = selectedDoctorIds.length;

    console.log(`[Doctor Service] Found ${uniqueDoctorCount} unique doctors in "${normalizedCity}".`);

    // 3. Apply limit and randomization if necessary
    if (uniqueDoctorCount > 3) {
        console.log("[Doctor Service] More than 3 doctors found, selecting 3 randomly.");
        shuffleArray(selectedDoctorIds); // Shuffle the array of IDs
        selectedDoctorIds = selectedDoctorIds.slice(0, 3); // Take the first 3
    } else {
         console.log(`[Doctor Service] Found ${uniqueDoctorCount} doctors, returning all.`);
    }

    // 4. Filter the original associations to include only selected doctors
    const finalDoctorData = allDoctorClinicAssociations.filter(assoc =>
        selectedDoctorIds.includes(assoc.id)
    );

    console.log(`[Doctor Service] Returning data for ${selectedDoctorIds.length} selected doctors.`);
    return finalDoctorData; // Return the filtered list of associations

  } catch (error) {
    console.error(`[Doctor Service] Failed doctor search for city "${normalizedCity}":`, error.message);
    return null; // Indicate failure
  }
}

/**
 * Formats doctor/clinic data into a user-friendly string, handling truncation.
 * @param {object[]} doctorClinicData - Array from findDoctorsByCity call.
 * @param {string} city - The requested city name.
 * @returns {string} Formatted list or 'not found' message.
 */
export function formatDoctorList(doctorClinicData, city) {
    if (!doctorClinicData || doctorClinicData.length === 0) {
        return `Desculpe, não encontrei médicos especialistas em endometriose cadastrados em ${city} no momento.`;
    }

    // Group results by doctor ID to consolidate clinic info under each unique doctor
    const groupedByDoctor = doctorClinicData.reduce((acc, item) => {
        const key = item.id; // Use doctor ID as the key
        if (!acc[key]) {
            acc[key] = {
                id: item.id,
                name: item.name,
                phone_number: item.phone_number,
                email: item.email,
                specialty: item.specialty,
                clinics: []
            };
        }
        // Add unique clinic names for this doctor
        if(item.clinic_name && !acc[key].clinics.includes(item.clinic_name)) {
             acc[key].clinics.push(item.clinic_name);
        }
        return acc;
    }, {});

    let response = `Aqui estão alguns médicos especialistas em endometriose que encontrei em ${city}:\n\n`;
    Object.values(groupedByDoctor).forEach((doc, index) => {
        response += `${index + 1}. ${doc.name}\n`;
        if (doc.specialty && doc.specialty !== 'Endometriosis') response += `   Especialidade: ${doc.specialty}\n`;
        if (doc.phone_number) response += `   Telefone Direto: ${doc.phone_number}\n`;
        if (doc.email) response += `   Email Direto: ${doc.email}\n`;
        if (doc.clinics.length > 0) {
             response += `   Clínica(s): ${doc.clinics.join(', ')}\n`;
        }
        response += '\n';
    });

    response = response.trim();

    // Truncate if exceeding WhatsApp limit (~1600 chars)
    if (response.length > 1600) {
        console.warn(`[Doctor Service] Formatted list too long (${response.length} chars), truncating.`);
        const cutOffIndex = response.lastIndexOf('\n', 1580);
        response = cutOffIndex > 0
            ? response.substring(0, cutOffIndex) + "\n\n...(lista truncada por limite de caracteres)"
            : response.substring(0, 1580) + "... (lista truncada)";
    }

    return response;
} 