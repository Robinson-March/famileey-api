# Fameely Backend API Documentation

Backend support structure for **Fameely** — a social platform for family connection, story sharing, and media engagement.

---

## Table of Contents
- [Authentication](#authentication)
- [User & Profile Management](#user--profile-management)
- [Story Management](#story-management)
- [Event Media](#event-media)
- [Engagement Features](#engagement-features)
- [Contribution Guidelines](#contribution-guidelines)

---

## Authentication

### `POST /api/auth/signup`
Registers a new user.
**Request Body:**
```json
{
  "familyName": "Doe",
  "nativeOf": "Ibadan",
  "district": "LGA name",
  "state": "Oyo",
  "country": "Nigeria",
  "residence": "Lagos",
  "email": "family@example.com",
  "phone": "+23480000000",
  "occupation": "Engineer",
  "worksAt": "Tech Ltd"
}
```

### `POST /api/auth/login`
Logs in a user and returns an auth token.

---

## User & Profile Management

### `POST /api/user/profile-picture`
Uploads a profile picture.
**Auth Required**

### `POST /api/family/profile`
Uploads a family profile (structured or document).
**Auth Required**

---

## Story Management

### `POST /api/family/story`
Submit a written story.
**Auth Required**

### `GET /api/family/stories`
List all families with uploaded stories.
**Public**

### `GET /api/family/story/:id`
Fetch a family story by ID.
**Public**

---

## Event Media

### `POST /api/family/event-media`
Uploads photos or videos of family events.
**Auth Required**

### `GET /api/family/videos`
Returns a list of available videos.
**Public**

### `GET /api/family/photos`
Returns a list of available photos.
**Public**

---

## Engagement Features

### `POST /api/engagement/like`
**Request Body:**
```json
{
  "contentId": "abc123",
  "type": "story|photo|video"
}
```
**Auth Required**

### `POST /api/engagement/comment`
**Request Body:**
```json
{
  "contentId": "abc123",
  "comment": "Inspiring story!"
}
```
**Auth Required**

### `POST /api/engagement/follow`
Follows another family by their ID.

### `POST /api/engagement/share`
Logs a content share event.
**Request Body:**
```json
{
  "contentId": "abc123",
  "platform": "whatsapp|facebook|email"
}
```

---

## Contribution Guidelines (for GitHub)
- Follow RESTful standards.
- Use JWT or similar for authorization.
- Protect endpoints with appropriate middleware.
- Raise issues or PRs to discuss new endpoints or refactors.
- Document every route in this file or OpenAPI format.

---

All backend features should align with the features described in the [Frontend Layout](./fameely_app_outline.md).

