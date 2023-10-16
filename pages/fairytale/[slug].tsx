/* eslint-disable @next/next/no-img-element */
import { getAllFairytaleSlugs, getFairytale } from 'lib/sanity.client'
import { iFairytale } from 'lib/sanity.queries'
import { GetStaticProps } from 'next'
import Image from 'next/image'
import { useState } from 'react'

interface PageProps {
  fairytale: iFairytale
}

interface Query {
  [key: string]: string
}

const FairtalePage = ({ fairytale }: PageProps) => {
  // destructure the fairytale object
  const { title } = fairytale
  console.log(fairytale)

  var jsonObject; 
  
  try {
    jsonObject = JSON.parse(fairytale.story ?? '{"description": "test"}');
  } 
  catch (e) {
    jsonObject = {};
  } 
  const story = jsonObject.story ?? "";
  const characters = jsonObject.characters ?? [];
  const imageDescription = jsonObject.imageDescription ?? "";

  const [storyImage, setStoryImage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [storyText  , setStoryText] = useState(fairytale.story ?? undefined);
  const [characterImages, setCharacterImages] = useState<string[]>([]);

  const generateNewStoryImage = async (jsonObject) => {
    // Replace the placeholder prompt with the actual title from fairytale.
    const prompt = jsonObject?.imageDescription ?? jsonObject?.story ?? title;  // Assuming that you only want to send the title as your prompt.

    setIsLoading(true);
    const response = await fetch('/api/openai-image', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // await all the promises for the character images.
    const characterImagePromises = characters.map(async (character) => {
      const characterPrompt = character.description ?? "";
      const characterResponse = await fetch('/api/openai-image', {
        method: 'POST',
        body: JSON.stringify({ prompt: characterPrompt }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const characterData = await characterResponse.json();
      return characterData.text;
    });

    const characterImages = await Promise.all(characterImagePromises);
    setCharacterImages(characterImages);

    const data = await response.json();

    setIsLoading(false);

    if ("text" in data) {
      setStoryImage(data.text);
    } else {
      console.error("The response object does not have a text property");
    }
  }

  const handleGenerateImage = async () => {
    
    await generateNewStoryImage(jsonObject);
  }
  
  return (
    <main className="p-10">
      <h1>{title}</h1>
      <button
        className="m-5 rounded-md bg-slate-500 px-2"
        onClick={handleGenerateImage}
      >
        Generate image
      </button>
      {isLoading && <p>Loading...</p>}

      {storyImage && <Image src={storyImage} alt="" width={256} height={256} />}
      {characterImages && characterImages.length > 0 && characterImages.map((characterImage) => {
        return <Image src={characterImage} alt="" width={256} height={256} />
      }
      )}
      {storyText}
      <br/>
      <hr/>
      <hr/>
      <p>Image Desciption:</p>
      {jsonObject?.imageDescription ?? jsonObject?.story ?? "No image description found."}
      {characterImages}
    </main>
  )
}

export const getStaticProps: GetStaticProps<PageProps, Query> = async (ctx) => {
  // Get the slug from the context
  const { params = {} } = ctx

  // Fetch the fairytale with the given slug
  const [fairytale] = await Promise.all([getFairytale(params.slug)])

  // If no fairytale was found, return 404
  if (!fairytale) {
    return {
      notFound: true,
    }
  }

  // Return the fairytale for Next.js to use
  return {
    props: {
      fairytale,
      // revalidate every two hours
      revalidate: 60 * 60 * 2,
    },
  }
}

export const getStaticPaths = async () => {
  // Fetch all fairytale slugs
  const slugs = await getAllFairytaleSlugs()

  return {
    paths: slugs?.map(({ slug }) => `/fairytale/${slug}`) || [],
    fallback: 'blocking',
  }
}

export default FairtalePage
