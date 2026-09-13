# Johor–Singapore crossing-length sources

Retrieved at `2026-09-13T04:07:19Z` for the Terra Astra three-question demo. The machine-readable record is [`public/data/crossings-evidence.json`](../public/data/crossings-evidence.json).

## Result

| Crossing | Structural length used | Published definition | Primary evidence |
| --- | ---: | --- | --- |
| Johor-Singapore Causeway | 1,056 m | Causeway structure, from bank to bank | National Heritage Board and National Library Board, Singapore |
| Malaysia-Singapore Second Link | 1,920 m | Bridge section crossing the Johor Strait | PLUS Malaysia Berhad, the highway operator |

These values describe the cross-strait structures. They do not describe a driving route, approach roads, checkpoints or interchanges.

## Johor-Singapore Causeway

The Singapore National Heritage Board's collection page identifies the setting and completed structure together:

> “The Johor-Singapore Causeway straddles the Straits of Johor between Johor Bahru city … and the Woodlands district …”

It then calls it:

> “The 1,056-metre-long causeway …”

Source: [The Johor-Singapore Causeway](https://www.roots.gov.sg/Collection-Landing/listing/1188433), National Heritage Board, Singapore. The page reports “Last Updated 15 October 2020”; retrieved 13 September 2026.

The National Library Board's BiblioAsia engineering history provides the decisive structural boundary:

> “The proposed Causeway would be 3,465 ft long (1,056 m) from bank to bank …”

Source: [The Making of the Causeway](https://biblioasia.nlb.gov.sg/all-sections/vol-20-issue-2-jul-sep-2024-singapore-malaysia-johor-causeway/), National Library Board, Singapore, July–September 2024; retrieved 13 September 2026. The article says its detailed construction account is edited from *The Causeway* (2011), jointly published by the National Archives of Malaysia and National Archives of Singapore.

The JSON therefore defines `1056 m` as the Causeway structure's bank-to-bank length. The NLB wording is a proposed engineering length, while NHB separately describes the completed causeway with the same value. It is not an approach-road or route distance.

## Malaysia-Singapore Second Link

PLUS Malaysia separates the system-wide highway length from its cross-strait bridge length in one sentence:

> “the 47-kilometre dual-three-lane highway, which includes a 1.92 km-long bridge crossing the Straits of Johor”

The same passage says the link connects Tanjung Kupang in Johor to Tuas in Singapore.

Source: [Our Expressways — Malaysia-Singapore Second Link (LINKEDUA)](https://www.plus.com.my/our-expressways/), PLUS Malaysia Berhad; retrieved 13 September 2026.

The JSON converts the operator's `1.92 km` bridge figure to `1920 m`. It deliberately excludes the `47 km` LINKEDUA highway length, which includes substantially more than the bridge crossing.

## Geometry status

Both coordinate pairs are schematic display lines. None of the cited length sources publishes surveyed endpoint coordinates, and these coordinates have not been independently verified. They must not be used to derive, check or imply the structural lengths. Endpoint labels only express the places named by the sources.

## Retrieval and verification notes

- NHB page lines 65–69 in the retrieved page text supported the Causeway's places and completed 1,056 m length.
- NLB BiblioAsia lines 45–59 supported the engineering context and the 1,056 m bank-to-bank definition.
- PLUS Malaysia page lines 89–96 supported the distinction between the 47 km highway and its 1.92 km bridge across the strait.
- Source domains are first-party public-institution or operator domains: `roots.gov.sg`, `nlb.gov.sg`, and `plus.com.my`.
