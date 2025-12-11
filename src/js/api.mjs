const translation = 'BSB'; 

// Fetch list of books from API
export async function getBooks(){
    const data = await fetch(`https://bible.helloao.org/api/${translation}/books.json`);
    const result = await data.json();
    return result.books; 
}

// Fetch specific chapter data
export async function getChapterVerses (book, chapter){
    const dataset = 'open-cross-ref'; 
    const data = await fetch(`https://bible.helloao.org/api/d/${dataset}/${book}/${chapter}.json`);
    const result = await data.json();
    return result;
}

// Fetch single verse text
export async function getVerse(book, chapter, verse) {
    const reference = `${book} ${chapter}:${verse}`;
    const encodedRef = encodeURIComponent(reference);

    const response = await fetch(`https://bible-api.com/${encodedRef}?translation=kjv`);
    
    if (!response.ok) {
        throw new Error('Verse not found');
    }

    return await response.json();
}