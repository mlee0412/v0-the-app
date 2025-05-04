"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import { Box, Card, CardContent, Typography } from "@mui/material"
import { styled } from "@mui/material/styles"
import { useSwipeable } from "react-swipeable"

interface Table {
  id: string
  name: string
  isActive: boolean
}

interface SwipeableTableCardProps {
  table: Table
  canEndSession: boolean
  canAddTime: boolean
  onEndSession: () => void
  onAddTime: () => void
  onDelete: () => void
  onClick: () => void
  swipeThreshold?: number
}

const StyledCard = styled(Card)(({ theme }) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: theme.spacing(1),
  boxShadow: theme.shadows[3],
  transition: "transform 0.3s ease-in-out",
  "&:hover": {
    boxShadow: theme.shadows[5],
  },
}))

const SwipeableTableCard: React.FC<SwipeableTableCardProps> = ({
  table,
  canEndSession,
  canAddTime,
  onEndSession,
  onAddTime,
  onDelete,
  onClick,
  swipeThreshold = 50,
}) => {
  const [xOffset, setXOffset] = useState(0)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)
  const touchStartedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const resetSwipe = useCallback(() => {
    setXOffset(0)
  }, [])

  useEffect(() => {
    if (!table.isActive) {
      resetSwipe()
    }
  }, [table.isActive, resetSwipe])

  const handleTouchStart = useCallback((event: TouchEvent) => {
    touchStartedRef.current = true
    startXRef.current = event.touches[0].clientX
    currentXRef.current = event.touches[0].clientX
  }, [])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchStartedRef.current) return

    currentXRef.current = event.touches[0].clientX
    const distance = currentXRef.current - startXRef.current
    setXOffset(distance)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartedRef.current) return
    touchStartedRef.current = false

    // Calculate swipe distance
    const distance = currentXRef.current - startXRef.current

    // Check if this was a tap rather than a swipe - be very permissive for iOS
    const isTap = Math.abs(distance) < 20

    if (isTap) {
      // This was a tap, not a swipe - directly call onClick
      resetSwipe()
      onClick()
      return
    }

    if (distance < -swipeThreshold && canEndSession) {
      onEndSession()
    } else if (distance > swipeThreshold && canAddTime) {
      onAddTime()
    } else {
      resetSwipe()
    }
  }, [
    table.id,
    table.isActive,
    canEndSession,
    canAddTime,
    onClick,
    onEndSession,
    onAddTime,
    resetSwipe,
    swipeThreshold,
  ])

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      if (!table.isActive) return
      setXOffset(eventData.deltaX)
    },
    onSwipedLeft: () => {
      if (!table.isActive) return
      if (canEndSession) {
        onEndSession()
      } else {
        resetSwipe()
      }
    },
    onSwipedRight: () => {
      if (!table.isActive) return
      if (canAddTime) {
        onAddTime()
      } else {
        resetSwipe()
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: false,
  })

  const cardStyle: CSSProperties = {
    transform: `translateX(${xOffset}px)`,
    transition: table.isActive ? "transform 0.3s ease-out" : "none",
  }

  return (
    <StyledCard
      {...swipeHandlers}
      ref={cardRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <CardContent>
        <Typography variant="h6" component="div">
          {table.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Table ID: {table.id}
        </Typography>
      </CardContent>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: (theme) => theme.spacing(1),
        }}
      >
        {/* <IconButton aria-label="delete" size="small" onClick={onDelete}>
          <DeleteIcon fontSize="small" />
        </IconButton> */}
      </Box>
    </StyledCard>
  )
}

export default SwipeableTableCard
