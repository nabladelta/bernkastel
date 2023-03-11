import React, { useEffect, useMemo, useState } from 'react'
import {
  ChakraProvider,
  Box,
  Text,
  Link,
  VStack,
  Code,
  Grid,
  Card,
  Image,
  Stack,
  Heading,
  Button,
  HStack,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverHeader,
  PopoverArrow,
  PopoverContent,
  PopoverCloseButton,
  PopoverBody,
  Portal
} from "@chakra-ui/react"
import { CardHeader, CardBody, CardFooter } from '@chakra-ui/react'
import { API_URL } from '../constants'
import { formatBytes, getPostDateString, isElementInViewport, isVideo, truncateText } from '../utils/utils'
import { useLocation } from 'react-router-dom'

function Post({post, replies, highlight, setHighlight}: {post: IPost, replies?: Set<IPost>, highlight: string | undefined, setHighlight?: React.Dispatch<React.SetStateAction<string | undefined>>}) {
    const dateString = useMemo(()=> {
        return getPostDateString(post.time)
    }, [post.time])

    const [imageWide, setImageWide] = useState(false)
    const {hash} = useLocation()
    const shortCode = post.no.slice(-16)
    const isHighlighted = setHighlight && ( highlight == shortCode || decodeURI(hash) == `#p${shortCode}` )

    function imageClick(e: any) {
        e.preventDefault()
        setImageWide((s)=> !s)
    }
    return (
        <Card
            id={`p${shortCode}`}
            bg={ isHighlighted ? "whiteAlpha.50": undefined}
            direction={{ base: 'column', sm: 'row' }}
            overflow='hidden'
            variant='outline'>
                {post.tim && !isVideo(post) &&

                <a href={`${API_URL}/file/${post.tim}${post.ext}`} target='_blank' onClick={imageClick}>
                    <Image
                    objectFit='contain'
                    boxSize={imageWide ? post.h : undefined}
                    maxW={imageWide ? { base: '100%', sm: `512px` } : { base: '150%', sm: `1024px` }}
                    src={imageWide ? `${API_URL}/file/${post.tim}${post.ext}` : `${API_URL}/thumb/${post.tim}.jpg`}
                    alt={`${post.filename}${post.ext}`} />

                </a>}
                {post.tim && isVideo(post) &&
                    <Box
                        as='video'
                        controls
                        loop={true}
                        src={`${API_URL}/file/${post.tim}${post.ext}`}
                        title={`${post.filename}${post.ext}`}
                        objectFit='contain'
                        sx={{
                            aspectRatio: `${post.h}/${post.w}`
                        }}
                    />}
            <Stack>
                <CardHeader>
                    <HStack spacing={7}>
                        {post.sub && <Text noOfLines={2} as='b'>{post.sub}</Text>}
                        <Text as='b' noOfLines={1}>{post.name || "Anonymous"}</Text>
                        <Text>{dateString}</Text>
                        <Text><Link _hover={{color: 'red'}} href={`#p${shortCode}`}>No.</Link> {shortCode}</Text>
                        {replies && <HStack spacing={2}>{Array.from(replies).map((p) => <ReplyLink post={p} setHighlight={setHighlight}></ReplyLink>)}</HStack>}{/*<Text fontSize='sm' as='u'>&gt;&gt;Z55ASQDFBS7FFQ</Text>*/}
                    </HStack>
                </CardHeader>
                <CardBody>
                    {post.parsedCom}
                </CardBody>

                <CardFooter>
                    <HStack spacing={7}>
                        {post.filename && <Tooltip label={`${post.filename}${post.ext}`}><Text as='i'>File: <a href={`${API_URL}/file/${post.tim}${post.ext}`} target='_blank'>{`${truncateText(post.filename, 24)}${post.ext}`}</a></Text></Tooltip>}{post.fsize  && <Text as='i'>{`(${formatBytes(post.fsize)}, ${post.w}x${post.h})`}</Text>}
                    </HStack>
                </CardFooter>
            </Stack>
        </Card>
  )
}

export default Post

export function ReplyLink({post, setHighlight, isInCom}: {post: IPost, isInCom?: boolean, setHighlight?: React.Dispatch<React.SetStateAction<string | undefined>>}) {
    const shortCode = post.no.slice(-16)
    function mouseEnter() {
        const postElement = document.getElementById(`p${shortCode}`)
        if (postElement && isElementInViewport(postElement)) {
            if (setHighlight) setHighlight(shortCode)
        } else {
            setIsOpen(true)
        }
    }
    function mouseLeave() {
        if (setHighlight) setHighlight('')
        setIsOpen(false)
    }
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Popover isOpen={isOpen} onClose={() => setIsOpen(false)} trigger='hover' openDelay={0} closeDelay={0} isLazy>
        <PopoverTrigger>
            
            <Link {...(isInCom ? {color: 'red.500'} : {fontSize: 'sm'})} textDecoration={'underline'}  onMouseEnter={mouseEnter} onMouseLeave={mouseLeave}  _hover={{color: 'red'}} href={`#p${shortCode}`}>&gt;&gt;{shortCode}</Link>
        </PopoverTrigger>
        <Portal>
        <PopoverContent boxSize={'100%'}>
        <Box fontSize="xl">
            <Post post={post} highlight={undefined}></Post>
        </Box>
        </PopoverContent>
        </Portal>
        </Popover>
    )
}