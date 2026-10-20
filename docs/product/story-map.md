# User Story Map: qrMaker

## Goal
Build a fully client-side (no backend, nothing leaves the browser), genuinely free "ultimate QR maker" that gives non-technical users meaningful customization and clean asset embedding without the paywalls, clutter, or gimmicky options of existing tools.

## Primary User
Small business owners and sports clubs with little to no technical knowledge, who want to create branded QR codes (for menus, flyers, team materials, etc.) using their own logos and colors, and need the result to actually work when printed small, stuck on curved surfaces, or left outdoors.

## Story Map

### Add Your Content
| #   | Story                                                                                   |
| --- | ---------------------------------------------------------------------------------------- |
| 001 | Enter a link or text to turn into a QR code                                              |
| 002 | Upload a file or image as the content to encode                                          |
| 003 | Choose which cleanups apply to the input (toggle tracking-param stripping, link shortening, etc. independently) |

### Design Your Code
| #   | Story                                                                                   |
| --- | ---------------------------------------------------------------------------------------- |
| 004 | See a live preview that updates in real time as content is added or customized           |
| 005 | Add a logo/image to the center of the code                                               |
| 006 | Customize colors and shapes (dot style, corners, color scheme)                           |
| 007 | Choose a code format/style (classic square QR vs. a stylized alternative)                |
| 008 | Get a guided error-correction recommendation based on logo/content size and intended use-case (e.g. curved surfaces, small print, outdoor exposure) |

### Manage Designs
| #   | Story                                                                                   |
| --- | ---------------------------------------------------------------------------------------- |
| 009 | Save the current customization settings as a reusable template                           |
| 010 | Overwrite/update an existing saved template                                              |
| 011 | Load a saved template to apply to a new QR code                                          |
| 012 | Share a template with someone else via an encoded shareable link (works when embedded assets like logos are small) |

### Export & Share
| #   | Story                                                                                   |
| --- | ---------------------------------------------------------------------------------------- |
| 013 | Download the QR code as a PNG                                                            |
| 014 | Download the QR code as an SVG (vector)                                                   |
| 015 | Choose resolution/size before exporting                                                  |
