import React, { useState, useCallback, useMemo, useEffect } from "react";
import DinoLabsNav from "../../helpers/Nav.jsx";
import { showDialog } from "../../helpers/Alert.jsx";
import "../../styles/mainStyles/DinoSat/CelestialReference.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faSearch, 
  faBook, 
  faFlask, 
  faSatellite, 
  faExternalLink, 
  faSpinner, 
  faTriangleExclamation, 
  faInfoCircle,
  faAtom,
  faCube,
  faRulerCombined,
  faEye,
  faPalette,
  faDatabase,
  faClockRotateLeft,
  faBookmark,
  faBookOpen,
  faXmark,
  faFilter,
  faGlobe,
  faSun,
  faSnowflake,
  faThermometerHalf,
  faMapMarkerAlt
} from "@fortawesome/free-solid-svg-icons";

export default function CelestialReference() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [objectDetails, setObjectDetails] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("celestialSearchHistory");
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load search history");
    }
  }, []);

  const saveToHistory = useCallback((query) => {
    if (!query.trim()) return;
    const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    
    try {
      localStorage.setItem("celestialSearchHistory", JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save search history");
    }
  }, [searchHistory]);

  const fetchWithRetry = async (url, options = {}, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  const searchCelestialObjects = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
        query + " celestial object"
      )}&srlimit=20&srnamespace=0&origin=*`;

      const response = await fetchWithRetry(searchUrl);
      const data = await response.json();
      
      if (!data?.query?.search) {
        setSearchResults([]);
        setError("No celestial objects found for this search term.");
        return;
      }

      const celestialResults = data.query.search.filter(result => {
        const title = result.title.toLowerCase();
        const snippet = result.snippet.toLowerCase();
        return (
          title.includes("planet") ||
          title.includes("star") ||
          title.includes("moon") ||
          title.includes("asteroid") ||
          title.includes("comet") ||
          title.includes("galaxy") ||
          title.includes("nebula") ||
          title.includes("constellation") ||
          title.includes("exoplanet") ||
          title.includes("meteor") ||
          title.includes("satellite") ||
          snippet.includes("celestial") ||
          snippet.includes("astronomical") ||
          snippet.includes("orbit") ||
          snippet.includes("solar system") ||
          snippet.includes("universe") ||
          snippet.includes("space") ||
          snippet.includes("astronomy") ||
          snippet.includes("astrophysics") ||
          snippet.includes("light-year") ||
          snippet.includes("magnitude") ||
          snippet.includes("telescope")
        );
      });

      setSearchResults(celestialResults);
      saveToHistory(query);

      if (celestialResults.length === 0) {
        setError("No astronomical results found. Try a different search term.");
      }

    } catch (error) {
      setError("Search failed. Please check your internet connection and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchDetailedObjectInfo = async (title) => {
    if (objectDetails[title]) {
      setSelectedObject({ title, ...objectDetails[title] });
      return;
    }

    setIsLoadingDetails(true);
    setError(null);

    try {
      const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageprops|pageimages|info&exlimit=1&explaintext=1&pithumbsize=500&formatversion=2&titles=${encodeURIComponent(
        title
      )}&origin=*&inprop=url`;

      const pageResponse = await fetchWithRetry(pageUrl);
      const pageData = await pageResponse.json();
      const page = pageData?.query?.pages?.[0];

      if (!page || page.missing) {
        setError("Celestial object information not found.");
        return;
      }

      const basicInfo = {
        title: page.title,
        extract: page.extract || "No detailed information available.",
        thumbnail: page.thumbnail,
        url: page.fullurl,
        wikibaseItem: page.pageprops?.wikibase_item
      };

      let detailedProperties = {};

      if (basicInfo.wikibaseItem) {
        try {
          const wdUrl = `https://www.wikidata.org/wiki/Special:EntityData/${basicInfo.wikibaseItem}.json?origin=*`;
          const wdResponse = await fetchWithRetry(wdUrl);
          const wdData = await wdResponse.json();
          const entity = wdData?.entities?.[basicInfo.wikibaseItem];

          if (entity?.claims) {
            const claims = entity.claims;
            
            const propertyMappings = {
              "Astronomical classification": "P31",
              "Parent astronomical body": "P397",
              "Orbital period": "P2146",
              "Mass": "P2067",
              "Radius": "P2120",
              "Distance from Earth": "P2583",
              "Surface temperature": "P2060",
              "Apparent magnitude": "P1215",
              "Absolute magnitude": "P1457",
              "Spectral class": "P2864",
              "Constellation": "P59",
              "Right ascension": "P6257",
              "Declination": "P6258",
              "Discoverer": "P61",
              "Discovery date": "P575",
              "Named after": "P138",
              "Atmospheric composition": "P2878",
              "Number of moons": "P2207",
              "Orbital eccentricity": "P1096",
              "Semi-major axis": "P2233",
              "Inclination": "P2045",
              "Surface gravity": "P2284",
              "Escape velocity": "P2368",
              "Rotation period": "P2147",
              "Albedo": "P2214",
              "Density": "P2054",
              "Age": "P2348"
            };

            const entityIds = new Set();
            Object.values(propertyMappings).forEach(propId => {
              const claim = claims[propId];
              if (claim) {
                claim.forEach(statement => {
                  const value = statement.mainsnak?.datavalue;
                  if (value?.type === "wikibase-entityid") {
                    entityIds.add(value.value.id);
                  }
                });
              }
            });

            let entityLabels = {};
            if (entityIds.size > 0) {
              const entityArray = Array.from(entityIds);
              for (let i = 0; i < entityArray.length; i += 50) {
                const chunk = entityArray.slice(i, i + 50);
                const labelUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&ids=${chunk.join(
                  "|"
                )}&props=labels&languages=en&origin=*`;
                const labelResponse = await fetchWithRetry(labelUrl);
                const labelData = await labelResponse.json();
                
                if (labelData.entities) {
                  Object.entries(labelData.entities).forEach(([id, entity]) => {
                    if (entity.labels?.en?.value) {
                      entityLabels[id] = entity.labels.en.value;
                    }
                  });
                }
              }
            }

            Object.entries(propertyMappings).forEach(([label, propId]) => {
              const claim = claims[propId];
              if (!claim) return;

              const values = [];
              claim.forEach(statement => {
                const datavalue = statement.mainsnak?.datavalue;
                if (!datavalue) return;

                let valueString = "";
                switch (datavalue.type) {
                  case "string":
                    valueString = datavalue.value;
                    break;
                  case "quantity":
                    valueString = datavalue.value.amount;
                    if (datavalue.value.unit) {
                      const unitId = datavalue.value.unit.split("/").pop();
                      const unitLabel = entityLabels[unitId] || unitId;
                      if (unitLabel !== "1") {
                        valueString += ` ${unitLabel}`;
                      }
                    }
                    break;
                  case "wikibase-entityid":
                    const entityId = datavalue.value.id;
                    valueString = entityLabels[entityId] || entityId;
                    break;
                  case "monolingualtext":
                    valueString = datavalue.value.text;
                    break;
                  case "time":
                    valueString = datavalue.value.time;
                    break;
                  default:
                    valueString = JSON.stringify(datavalue.value);
                }

                if (valueString) {
                  values.push(valueString);
                }
              });

              if (values.length > 0) {
                detailedProperties[label] = values.join("; ");
              }
            });
          }
        } catch (wdError) {
          console.error("Failed to fetch Wikidata properties");
        }
      }

      const fullInfo = {
        ...basicInfo,
        properties: detailedProperties
      };

      setObjectDetails(prev => ({ ...prev, [title]: fullInfo }));
      setSelectedObject(fullInfo);

    } catch (error) {
      setError("Failed to load celestial object details. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSearch = useCallback((query = searchQuery) => {
    if (!isOnline) {
      setError("No internet connection. Please connect to search for celestial objects.");
      return;
    }
    searchCelestialObjects(query);
  }, [searchQuery, isOnline]);

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedObject(null);
    setError(null);
  };

  const getPropertyIcon = (property) => {
    switch (property.toLowerCase()) {
      case "astronomical classification":
      case "spectral class":
        return faAtom;
      case "surface temperature":
      case "apparent magnitude":
        return faPalette;
      case "orbital period":
      case "rotation period":
        return faSun;
      case "atmospheric composition":
      case "surface gravity":
        return faSnowflake;
      case "distance from earth":
      case "constellation":
        return faThermometerHalf;
      case "discoverer":
      case "discovery date":
        return faMapMarkerAlt;
      default:
        return faGlobe;
    }
  };

  const organizedProperties = useMemo(() => {
    if (!selectedObject?.properties) return {};
    
    const categories = {
      "Classification": ["Astronomical classification", "Spectral class", "Constellation", "Named after"],
      "Physical": ["Mass", "Radius", "Density", "Surface gravity", "Surface temperature", "Albedo"],
      "Orbital": ["Orbital period", "Orbital eccentricity", "Semi-major axis", "Inclination", "Escape velocity"],
      "Observational": ["Apparent magnitude", "Absolute magnitude", "Right ascension", "Declination", "Distance from Earth"],
      "Discovery": ["Discoverer", "Discovery date", "Age"],
      "Composition": ["Atmospheric composition", "Number of moons", "Rotation period"],
      "Other": []
    };

    const organized = {};
    const usedProperties = new Set();

    Object.entries(categories).forEach(([category, properties]) => {
      const categoryProperties = {};
      properties.forEach(property => {
        if (selectedObject.properties[property]) {
          categoryProperties[property] = selectedObject.properties[property];
          usedProperties.add(property);
        }
      });
      if (Object.keys(categoryProperties).length > 0) {
        organized[category] = categoryProperties;
      }
    });

    const otherProperties = {};
    Object.entries(selectedObject.properties).forEach(([property, value]) => {
      if (!usedProperties.has(property)) {
        otherProperties[property] = value;
      }
    });
    if (Object.keys(otherProperties).length > 0) {
      organized["Other"] = otherProperties;
    }

    return organized;
  }, [selectedObject]);

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sat"} />
      <div className="celestialReferenceContainer">
        <main className="celestialReferenceMain">
          <aside className="celestialReferenceSidebar">
            <div className="celestialReferenceSidebarHeader">
              <div className="celestialReferenceTitleLeft">
                <img className="celestialReferenceLogo" src="/DinoSatLogo.png" alt="Logo" />
                <h1 className="celestialReferenceTitle">Celestial Reference</h1>
              </div>

              <div className="celestialReferenceBanner">
                <span className="celestialReferenceBannerText">
                  <FontAwesomeIcon icon={faDatabase} /> Comprehensive astronomical database
                </span>
                {searchResults.length > 0 && (
                  <span className="celestialReferenceBannerText">
                    <FontAwesomeIcon icon={faFilter} /> {searchResults.length} results
                  </span>
                )}
              </div>
            </div>

            <div className="celestialReferenceSearchBox">
              <input
                className="celestialReferenceSearchInput"
                type="text"
                placeholder="Search planets, stars, moons, galaxies..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyPress={handleKeyPress}
              />
              {searchQuery && (
                <button 
                  className="celestialReferenceClearButton"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </div>

            <div className="celestialReferenceActions">
              <button
                className={`celestialReferenceButton celestialReferenceButtonPrimary ${isSearching ? "celestialReferenceButtonBusy" : ""}`}
                onClick={() => handleSearch()}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="celestialReferenceSpinner" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSearch} />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>

            {searchHistory.length > 0 && (
              <div className="celestialReferenceHistory">
                <div className="celestialReferenceHistoryLabel">
                  <FontAwesomeIcon icon={faClockRotateLeft} />
                  Recent searches:
                </div>
                <div className="celestialReferenceHistoryTags">
                  {searchHistory.slice(0, 5).map((query, index) => (
                    <button
                      key={index}
                      className="celestialReferenceHistoryTag"
                      onClick={() => {
                        setSearchQuery(query);
                        handleSearch(query);
                      }}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="celestialReferenceAlert">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span>{error}</span>
              </div>
            )}

            <div className="celestialReferenceList">
              {!searchQuery && searchResults.length === 0 && !error && (
                <div className="celestialReferenceWelcome">
                  <div className="celestialReferenceWelcomeIcon">
                    <FontAwesomeIcon icon={faSatellite} />
                  </div>
                  <h2 className="celestialReferenceWelcomeTitle">Explore the Universe</h2>
                  <p className="celestialReferenceWelcomeText">
                    Search our comprehensive astronomical database to discover detailed information about planets, stars, galaxies, and other celestial objects.
                  </p>
                  <div className="celestialReferenceExampleTags">
                    {["Mars", "Sirius", "Europa", "Andromeda", "Halley's Comet", "Proxima Centauri"].map(example => (
                      <button
                        key={example}
                        className="celestialReferenceExampleTag"
                        onClick={() => {
                          setSearchQuery(example);
                          handleSearch(example);
                        }}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="celestialReferenceResults">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.pageid || index}
                      className={`celestialReferenceRow ${selectedObject?.title === result.title ? "celestialReferenceRowActive" : ""}`}
                      onClick={() => fetchDetailedObjectInfo(result.title)}
                    >
                      <div className="celestialReferenceRowMain">
                        <div className={`celestialReferenceRowTitle ${selectedObject?.title === result.title ? "celestialReferenceRowTitleOn" : ""}`}>
                          {result.title}
                        </div>
                        <div className={`celestialReferenceRowSub ${selectedObject?.title === result.title ? "celestialReferenceRowSubOn" : ""}`}>
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: result.snippet || "Click to view detailed information"
                            }} 
                          />
                        </div>
                        <div className="celestialReferenceSync">
                          <FontAwesomeIcon icon={faExternalLink} className="celestialReferenceSyncIcon" />
                          <span>Wikipedia</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="celestialReferenceContent">
            {!selectedObject ? (
              <div className="celestialReferenceEmpty">
                <FontAwesomeIcon icon={faSatellite} className="celestialReferenceEmptyIcon" />
                <div className="celestialReferenceEmptyTitle">No Celestial Object Selected</div>
                <div className="celestialReferenceEmptyText">
                  Search and select a celestial object from the list to view detailed astronomical properties and observational data.
                </div>
              </div>
            ) : (
              <div className="celestialReferenceDetail">
                <div className="celestialReferenceDetailHead">
                  <div className="celestialReferenceSpecInfo">
                    <div className="celestialReferenceSpecText">
                      <div className="celestialReferenceSpecName">{selectedObject.title}</div>
                      <div className="celestialReferenceSpecId">Astronomical Reference</div>
                    </div>
                  </div>
                  <div className="celestialReferenceExportRow">
                    <button
                      className="celestialReferenceButton celestialReferenceButtonSecondary"
                      onClick={() => window.open(selectedObject.url, "_blank", "noopener,noreferrer")}
                    >
                      <FontAwesomeIcon icon={faExternalLink} />
                      <span>Wikipedia</span>
                    </button>
                  </div>
                </div>

                {isLoadingDetails ? (
                  <div className="celestialReferenceLoading">
                    <FontAwesomeIcon icon={faSpinner} className="celestialReferenceLoadingSpinner" />
                    <span>Loading detailed information...</span>
                  </div>
                ) : (
                  <div className="celestialReferenceDetailBody">
                    <div className="celestialReferenceOverview">
                      {selectedObject.thumbnail?.source && (
                        <div className="celestialReferenceImageWrap">
                          <img 
                            src={selectedObject.thumbnail.source} 
                            alt={`${selectedObject.title} thumbnail`}
                            className="celestialReferenceImage"
                          />
                        </div>
                      )}
                      
                      <div className="celestialReferenceSections">
                        <div className="celestialReferenceSec">
                          <div className="celestialReferenceSecHead">
                            <div className="celestialReferenceSecIcon">
                              <FontAwesomeIcon icon={faBook} />
                            </div>
                            <div className="celestialReferenceSecTitle">Description</div>
                          </div>
                          <div className="celestialReferenceFields">
                            <div className="celestialReferenceCell">
                              <div className="celestialReferenceCellVal">
                                {selectedObject.extract}
                              </div>
                            </div>
                          </div>
                        </div>

                        {Object.keys(organizedProperties).length > 0 && (
                          <div className="celestialReferenceSec">
                            <div className="celestialReferenceSecHead">
                              <div className="celestialReferenceSecIcon">
                                <FontAwesomeIcon icon={faGlobe} />
                              </div>
                              <div className="celestialReferenceSecTitle">Astronomical Properties & Observational Data</div>
                            </div>
                            <div className="celestialReferenceFields">
                              {Object.entries(organizedProperties).map(([category, properties]) => (
                                <div key={category} className="celestialReferencePropertyCategory">
                                  <h4 className="celestialReferencePropertyCategoryTitle">{category}</h4>
                                  {Object.entries(properties).map(([property, value]) => (
                                    <div key={property} className="celestialReferenceCell">
                                      <div className="celestialReferenceCellKey">{property}</div>
                                      <div className="celestialReferenceCellVal">{value}</div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="celestialReferenceFootNote">
                      <FontAwesomeIcon icon={faDatabase} /> Wikipedia Reference — Accessed: {new Date().toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}