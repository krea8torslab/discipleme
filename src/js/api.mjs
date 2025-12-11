const translation = 'KJV'; 

// Get the list of books
export async function getBooks(){
    const data = await fetch(`https://bible.helloao.org/api/BSB/books.json`);
    const result = await data.json();
    return result.books; // Returns the array of book objects
}

// Get number of verses in a chapter
export async function getChapterVerses (book, chapter){
    const dataset = 'open-cross-ref'; 
    const data = await fetch(`https://bible.helloao.org/api/d/${dataset}/${book}/${chapter}.json`);
    const result = await data.json();
    return result;
}

export async function getVerse(book, chapter, verse) {
    // 1. Construct the string (e.g., "Genesis 3:16")
    const reference = `${book} ${chapter}:${verse}`;
    
    // 2. Encode it safely
    const encodedRef = encodeURIComponent(reference);

    // 3. Fetch
    const response = await fetch(`https://bible-api.com/${encodedRef}?translation=kjv`);
    
    if (!response.ok) {
        throw new Error('Verse not found');
    }

    const result = await response.json();
    return result;
}

