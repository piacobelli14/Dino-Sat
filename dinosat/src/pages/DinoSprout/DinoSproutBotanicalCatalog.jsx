import React, { useState, useCallback, useMemo, useEffect } from "react";
import DinoLabsNav from "../../helpers/Nav.jsx";
import { showDialog } from "../../helpers/Alert.jsx";
import "../../styles/mainStyles/DinoSprout/DinoSproutBotanicalCatalog.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faSearch, 
  faBook, 
  faFlask, 
  faSeedling, 
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
  faLeaf,
  faSun,
  faDroplet,
  faThermometerHalf,
  faMapMarkerAlt
} from "@fortawesome/free-solid-svg-icons";

export default function DinoSproutBotanicalCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [plantDetails, setPlantDetails] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("botanicalSearchHistory");
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveToHistory = useCallback((query) => {
    if (!query.trim()) return;
    const newHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    
    try {
      localStorage.setItem("botanicalSearchHistory", JSON.stringify(newHistory));
    } catch {}
  }, [searchHistory]);

  const fetchWithRetry = async (url, options = {}, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res;
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
  };

  const searchPlants = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
        query + " plant"
      )}&srlimit=20&srnamespace=0&origin=*`;

      const response = await fetchWithRetry(searchUrl);
      const data = await response.json();
      
      if (!data?.query?.search) {
        setSearchResults([]);
        setError("No plants found for this search term.");
        return;
      }

      const plantResults = data.query.search.filter(result => {
        const title = result.title.toLowerCase();
        const snippet = result.snippet.toLowerCase();
        return (
          title.includes("plant") ||
          title.includes("flower") ||
          title.includes("tree") ||
          title.includes("herb") ||
          title.includes("shrub") ||
          title.includes("vine") ||
          title.includes("fern") ||
          title.includes("moss") ||
          snippet.includes("plant") ||
          snippet.includes("flower") ||
          snippet.includes("botanical") ||
          snippet.includes("species") ||
          snippet.includes("cultivation") ||
          snippet.includes("garden") ||
          snippet.includes("leaf") ||
          snippet.includes("bloom") ||
          snippet.includes("photosynthesis")
        );
      });

      setSearchResults(plantResults);
      saveToHistory(query);

      if (plantResults.length === 0) {
        setError("No botanical results found. Try a different search term.");
      }

    } catch (error) {
      setError("Search failed. Please check your internet connection and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchDetailedPlantInfo = async (title) => {
    if (plantDetails[title]) {
      setSelectedPlant({ title, ...plantDetails[title] });
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
        setError("Plant information not found.");
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
              "Scientific name": "P225",
              "Taxon rank": "P105",
              "Parent taxon": "P171",
              "Common name": "P1843",
              "Native to": "P183",
              "IUCN conservation status": "P141",
              "Flower color": "P2046",
              "Leaf type": "P5008",
              "Plant height": "P2048",
              "Bloom time": "P3190",
              "Hardiness zone": "P2980",
              "Sun requirements": "P5031",
              "Water requirements": "P5032",
              "Soil type": "P5033",
              "Growth habit": "P5034",
              "Life cycle": "P2043",
              "Pollination": "P2913",
              "Fruit type": "P846",
              "Seed dispersal": "P5035",
              "Habitat": "P7931",
              "Elevation": "P2044",
              "Cultivation": "P5036"
            };

            const entityIds = new Set();
            Object.values(propertyMappings).forEach(propId => {
              const claim = claims[propId];
              if (claim) {
                claim.forEach(stmt => {
                  const value = stmt.mainsnak?.datavalue;
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
              claim.forEach(stmt => {
                const datavalue = stmt.mainsnak?.datavalue;
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
        } catch (wdError) {}
      }

      const fullInfo = {
        ...basicInfo,
        properties: detailedProperties
      };

      setPlantDetails(prev => ({ ...prev, [title]: fullInfo }));
      setSelectedPlant(fullInfo);

    } catch (error) {
      setError("Failed to load plant details. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSearch = useCallback((query = searchQuery) => {
    if (!isOnline) {
      setError("No internet connection. Please connect to search for plants.");
      return;
    }
    searchPlants(query);
  }, [searchQuery, isOnline]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPlant(null);
    setError(null);
  };

  const getPropertyIcon = (property) => {
    switch (property.toLowerCase()) {
      case "scientific name":
      case "taxon rank":
        return faAtom;
      case "flower color":
      case "leaf type":
        return faPalette;
      case "sun requirements":
        return faSun;
      case "water requirements":
        return faDroplet;
      case "hardiness zone":
        return faThermometerHalf;
      case "native to":
      case "habitat":
        return faMapMarkerAlt;
      default:
        return faLeaf;
    }
  };

  const organizedProperties = useMemo(() => {
    if (!selectedPlant?.properties) return {};
    
    const categories = {
      "Taxonomic": ["Scientific name", "Taxon rank", "Parent taxon", "Common name"],
      "Physical": ["Plant height", "Flower color", "Leaf type", "Fruit type", "Growth habit"],
      "Cultivation": ["Sun requirements", "Water requirements", "Soil type", "Hardiness zone", "Bloom time"],
      "Ecological": ["Native to", "Habitat", "Elevation", "IUCN conservation status", "Pollination", "Seed dispersal"],
      "Life Cycle": ["Life cycle", "Cultivation"],
      "Other": []
    };

    const organized = {};
    const usedProps = new Set();

    Object.entries(categories).forEach(([category, props]) => {
      const categoryProps = {};
      props.forEach(prop => {
        if (selectedPlant.properties[prop]) {
          categoryProps[prop] = selectedPlant.properties[prop];
          usedProps.add(prop);
        }
      });
      if (Object.keys(categoryProps).length > 0) {
        organized[category] = categoryProps;
      }
    });

    const otherProps = {};
    Object.entries(selectedPlant.properties).forEach(([prop, value]) => {
      if (!usedProps.has(prop)) {
        otherProps[prop] = value;
      }
    });
    if (Object.keys(otherProps).length > 0) {
      organized["Other"] = otherProps;
    }

    return organized;
  }, [selectedPlant]);

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"sprout"} />
      <div className="botanicalReferenceContainer">
        <main className="botanicalReferenceMain">
          <aside className="botanicalReferenceSidebar">
            <div className="botanicalReferenceSidebarHeader">
              <div className="botanicalReferenceTitleLeft">
                <img className="botanicalReferenceLogo" src="/DinoSproutLogo.png" alt="Logo" />
                <h1 className="botanicalReferenceTitle">Botanical Reference</h1>
              </div>

              <div className="botanicalReferenceBanner">
                <span className="botanicalReferenceBannerText">
                  <FontAwesomeIcon icon={faDatabase} /> Comprehensive plant database
                </span>
                {searchResults.length > 0 && (
                  <span className="botanicalReferenceBannerText">
                    <FontAwesomeIcon icon={faFilter} /> {searchResults.length} results
                  </span>
                )}
              </div>
            </div>

            <div className="botanicalReferenceSearchBox">
              <input
                className="botanicalReferenceSearchInput"
                type="text"
                placeholder="Search plants, flowers, trees…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              {searchQuery && (
                <button 
                  className="botanicalReferenceClearButton"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </div>

            <div className="botanicalReferenceActions">
              <button
                className={`botanicalReferenceButton botanicalReferenceButtonPrimary ${isSearching ? "botanicalReferenceButtonBusy" : ""}`}
                onClick={() => handleSearch()}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="botanicalReferenceSpinner" />
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
              <div className="botanicalReferenceHistory">
                <div className="botanicalReferenceHistoryLabel">
                  <FontAwesomeIcon icon={faClockRotateLeft} />
                  Recent searches:
                </div>
                <div className="botanicalReferenceHistoryTags">
                  {searchHistory.slice(0, 5).map((query, index) => (
                    <button
                      key={index}
                      className="botanicalReferenceHistoryTag"
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
              <div className="botanicalReferenceAlert">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span>{error}</span>
              </div>
            )}

            <div className="botanicalReferenceList">
              {!searchQuery && searchResults.length === 0 && !error && (
                <div className="botanicalReferenceWelcome">
                  <div className="botanicalReferenceWelcomeIcon">
                    <FontAwesomeIcon icon={faSeedling} />
                  </div>
                  <h2 className="botanicalReferenceWelcomeTitle">Explore Plant Kingdom</h2>
                  <p className="botanicalReferenceWelcomeText">
                    Search our comprehensive botanical database to discover detailed information about plants, flowers, trees, and more.
                  </p>
                  <div className="botanicalReferenceExampleTags">
                    {["Tomato", "Rose", "Oak Tree", "Basil", "Sunflower", "Lettuce"].map(example => (
                      <button
                        key={example}
                        className="botanicalReferenceExampleTag"
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
                <div className="botanicalReferenceResults">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.pageid || index}
                      className={`botanicalReferenceRow ${selectedPlant?.title === result.title ? "botanicalReferenceRowActive" : ""}`}
                      onClick={() => fetchDetailedPlantInfo(result.title)}
                    >
                      <div className="botanicalReferenceRowMain">
                        <div className={`botanicalReferenceRowTitle ${selectedPlant?.title === result.title ? "botanicalReferenceRowTitleOn" : ""}`}>
                          {result.title}
                        </div>
                        <div className={`botanicalReferenceRowSub ${selectedPlant?.title === result.title ? "botanicalReferenceRowSubOn" : ""}`}>
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: result.snippet || "Click to view detailed information"
                            }} 
                          />
                        </div>
                        <div className="botanicalReferenceSync">
                          <FontAwesomeIcon icon={faExternalLink} className="botanicalReferenceSyncIcon" />
                          <span>Wikipedia</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="botanicalReferenceContent">
            {!selectedPlant ? (
              <div className="botanicalReferenceEmpty">
                <FontAwesomeIcon icon={faSeedling} className="botanicalReferenceEmptyIcon" />
                <div className="botanicalReferenceEmptyTitle">No Plant Selected</div>
                <div className="botanicalReferenceEmptyText">
                  Search and select a plant from the list to view detailed botanical properties and growing information.
                </div>
              </div>
            ) : (
              <div className="botanicalReferenceDetail">
                <div className="botanicalReferenceDetailHead">
                  <div className="botanicalReferenceSpecInfo">
                    <div className="botanicalReferenceSpecText">
                      <div className="botanicalReferenceSpecName">{selectedPlant.title}</div>
                      <div className="botanicalReferenceSpecId">Botanical Reference</div>
                    </div>
                  </div>
                  <div className="botanicalReferenceExportRow">
                    <button
                      className="botanicalReferenceButton botanicalReferenceButtonSecondary"
                      onClick={() => window.open(selectedPlant.url, "_blank", "noopener,noreferrer")}
                    >
                      <FontAwesomeIcon icon={faExternalLink} />
                      <span>Wikipedia</span>
                    </button>
                  </div>
                </div>

                {isLoadingDetails ? (
                  <div className="botanicalReferenceLoading">
                    <FontAwesomeIcon icon={faSpinner} className="botanicalReferenceLoadingSpinner" />
                    <span>Loading detailed information...</span>
                  </div>
                ) : (
                  <div className="botanicalReferenceDetailBody">
                    <div className="botanicalReferenceOverview">
                      {selectedPlant.thumbnail?.source && (
                        <div className="botanicalReferenceImageWrap">
                          <img 
                            src={selectedPlant.thumbnail.source} 
                            alt={`${selectedPlant.title} thumbnail`}
                            className="botanicalReferenceImage"
                          />
                        </div>
                      )}
                      
                      <div className="botanicalReferenceSections">
                        <div className="botanicalReferenceSec">
                          <div className="botanicalReferenceSecHead">
                            <div className="botanicalReferenceSecIcon">
                              <FontAwesomeIcon icon={faBook} />
                            </div>
                            <div className="botanicalReferenceSecTitle">Description</div>
                          </div>
                          <div className="botanicalReferenceFields">
                            <div className="botanicalReferenceCell">
                              <div className="botanicalReferenceCellVal">
                                {selectedPlant.extract}
                              </div>
                            </div>
                          </div>
                        </div>

                        {Object.keys(organizedProperties).length > 0 && (
                          <div className="botanicalReferenceSec">
                            <div className="botanicalReferenceSecHead">
                              <div className="botanicalReferenceSecIcon">
                                <FontAwesomeIcon icon={faLeaf} />
                              </div>
                              <div className="botanicalReferenceSecTitle">Botanical Properties & Growing Info</div>
                            </div>
                            <div className="botanicalReferenceFields">
                              {Object.entries(organizedProperties).map(([category, properties]) => (
                                <div key={category} className="botanicalReferencePropertyCategory">
                                  <h4 className="botanicalReferencePropertyCategoryTitle">{category}</h4>
                                  {Object.entries(properties).map(([property, value]) => (
                                    <div key={property} className="botanicalReferenceCell">
                                      <div className="botanicalReferenceCellKey">{property}</div>
                                      <div className="botanicalReferenceCellVal">{value}</div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="botanicalReferenceFootNote">
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