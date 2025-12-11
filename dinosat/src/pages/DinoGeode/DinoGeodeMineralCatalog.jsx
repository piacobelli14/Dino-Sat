import React, { useState, useCallback, useMemo, useEffect } from "react";
import DinoLabsNav from "../../helpers/Nav.jsx";
import { showDialog } from "../../helpers/Alert.jsx";
import "../../styles/mainStyles/DinoGeode/DinoGeodeMineralCatalog.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faSearch, 
  faBook, 
  faFlask, 
  faGem, 
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
  faFilter
} from "@fortawesome/free-solid-svg-icons";

export default function MineralCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMineral, setSelectedMineral] = useState(null);
  const [mineralDetails, setMineralDetails] = useState({});
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
      const saved = localStorage.getItem("mineralSearchHistory");
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
      localStorage.setItem("mineralSearchHistory", JSON.stringify(newHistory));
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

  const searchMinerals = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(
        query + " mineral"
      )}&srlimit=20&srnamespace=0&origin=*`;

      const response = await fetchWithRetry(searchUrl);
      const data = await response.json();
      
      if (!data?.query?.search) {
        setSearchResults([]);
        setError("No minerals found for this search term.");
        return;
      }

      const mineralResults = data.query.search.filter(result => {
        const title = result.title.toLowerCase();
        const snippet = result.snippet.toLowerCase();
        return (
          title.includes("mineral") ||
          title.includes("ite") ||
          title.includes("ine") ||
          snippet.includes("mineral") ||
          snippet.includes("crystal") ||
          snippet.includes("hardness") ||
          snippet.includes("chemical formula")
        );
      });

      setSearchResults(mineralResults);
      saveToHistory(query);

      if (mineralResults.length === 0) {
        setError("No mineral results found. Try a different search term.");
      }

    } catch (error) {
      setError("Search failed. Please check your internet connection and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchDetailedMineralInfo = async (title) => {
    if (mineralDetails[title]) {
      setSelectedMineral({ title, ...mineralDetails[title] });
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
        setError("Mineral information not found.");
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
              "Chemical formula": "P274",
              "General formula": "P1673",
              "Crystal system": "P556",
              "Mohs hardness": "P1088",
              "Color": "P462",
              "Luster": "P2157",
              "Streak": "P534",
              "Specific gravity": "P2054",
              "Refractive index": "P1109",
              "Cleavage": "P2768",
              "Fracture": "P2767",
              "Transparency": "P1296",
              "Birefringence": "P2751",
              "Ultraviolet fluorescence": "P1123",
              "Magnetic susceptibility": "P2204",
              "Thermal conductivity": "P2068",
              "Melting point": "P2101",
              "Density": "P2054",
              "Occurrence": "P189"
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

      setMineralDetails(prev => ({ ...prev, [title]: fullInfo }));
      setSelectedMineral(fullInfo);

    } catch (error) {
      setError("Failed to load mineral details. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSearch = useCallback((query = searchQuery) => {
    if (!isOnline) {
      setError("No internet connection. Please connect to search for minerals.");
      return;
    }
    searchMinerals(query);
  }, [searchQuery, isOnline]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedMineral(null);
    setError(null);
  };

  const getPropertyIcon = (property) => {
    switch (property.toLowerCase()) {
      case "chemical formula":
      case "general formula":
        return faAtom;
      case "crystal system":
        return faCube;
      case "color":
        return faPalette;
      case "mohs hardness":
        return faRulerCombined;
      case "transparency":
      case "luster":
        return faEye;
      default:
        return faFlask;
    }
  };

  const organizedProperties = useMemo(() => {
    if (!selectedMineral?.properties) return {};
    
    const categories = {
      "Chemical": ["Chemical formula", "General formula"],
      "Physical": ["Color", "Luster", "Streak", "Transparency", "Mohs hardness", "Specific gravity", "Density"],
      "Optical": ["Refractive index", "Birefringence", "Ultraviolet fluorescence"],
      "Structural": ["Crystal system", "Cleavage", "Fracture"],
      "Other": []
    };

    const organized = {};
    const usedProps = new Set();

    Object.entries(categories).forEach(([category, props]) => {
      const categoryProps = {};
      props.forEach(prop => {
        if (selectedMineral.properties[prop]) {
          categoryProps[prop] = selectedMineral.properties[prop];
          usedProps.add(prop);
        }
      });
      if (Object.keys(categoryProps).length > 0) {
        organized[category] = categoryProps;
      }
    });

    const otherProps = {};
    Object.entries(selectedMineral.properties).forEach(([prop, value]) => {
      if (!usedProps.has(prop)) {
        otherProps[prop] = value;
      }
    });
    if (Object.keys(otherProps).length > 0) {
      organized["Other"] = otherProps;
    }

    return organized;
  }, [selectedMineral]);

  return (
    <div className="dinoSatPageWrapper">
      <DinoLabsNav activePage={"geode"} />
      <div className="mineralLibraryContainer">
        <main className="mineralLibraryMain">
          <aside className="mineralLibrarySidebar">
            <div className="mineralLibrarySidebarHeader">
              <div className="mineralLibraryTitleLeft">
                <img className="mineralLibraryLogo" src="/DinoGeodeLogo.png" alt="Logo" />
                <h1 className="mineralLibraryTitle">Mineral Catalog</h1>
              </div>

              <div className="mineralLibraryBanner">
                <span className="mineralLibraryBannerText">
                  <FontAwesomeIcon icon={faDatabase} /> Comprehensive reference
                </span>
                {searchResults.length > 0 && (
                  <span className="mineralLibraryBannerText">
                    <FontAwesomeIcon icon={faFilter} /> {searchResults.length} results
                  </span>
                )}
              </div>
            </div>

            <div className="mineralLibrarySearchBox">
              <input
                className="mineralLibrarySearchInput"
                type="text"
                placeholder="Search minerals…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              {searchQuery && (
                <button 
                  className="mineralLibraryClearButton"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </div>

            <div className="mineralLibraryActions">
              <button
                className={`mineralLibraryButton mineralLibraryButtonPrimary ${isSearching ? "mineralLibraryButtonBusy" : ""}`}
                onClick={() => handleSearch()}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="mineralLibrarySpinner" />
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
              <div className="mineralLibraryHistory">
                <div className="mineralLibraryHistoryLabel">
                  <FontAwesomeIcon icon={faClockRotateLeft} />
                  Recent searches:
                </div>
                <div className="mineralLibraryHistoryTags">
                  {searchHistory.slice(0, 5).map((query, index) => (
                    <button
                      key={index}
                      className="mineralLibraryHistoryTag"
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
              <div className="mineralLibraryAlert">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span>{error}</span>
              </div>
            )}

            <div className="mineralLibraryList">
              {!searchQuery && searchResults.length === 0 && !error && (
                <div className="mineralLibraryWelcome">
                  <div className="mineralLibraryWelcomeIcon">
                    <FontAwesomeIcon icon={faBookOpen} />
                  </div>
                  <h2 className="mineralLibraryWelcomeTitle">Explore Minerals</h2>
                  <p className="mineralLibraryWelcomeText">
                    Search our comprehensive database to discover detailed information about minerals.
                  </p>
                  <div className="mineralLibraryExampleTags">
                    {["Quartz", "Feldspar", "Pyrite", "Calcite", "Fluorite"].map(example => (
                      <button
                        key={example}
                        className="mineralLibraryExampleTag"
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
                <div className="mineralLibraryResults">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.pageid || index}
                      className={`mineralLibraryRow ${selectedMineral?.title === result.title ? "mineralLibraryRowActive" : ""}`}
                      onClick={() => fetchDetailedMineralInfo(result.title)}
                    >
                      <div className="mineralLibraryRowMain">
                        <div className={`mineralLibraryRowTitle ${selectedMineral?.title === result.title ? "mineralLibraryRowTitleOn" : ""}`}>
                          {result.title}
                        </div>
                        <div className={`mineralLibraryRowSub ${selectedMineral?.title === result.title ? "mineralLibraryRowSubOn" : ""}`}>
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: result.snippet || "Click to view detailed information"
                            }} 
                          />
                        </div>
                        <div className="mineralLibrarySync">
                          <FontAwesomeIcon icon={faExternalLink} className="mineralLibrarySyncIcon" />
                          <span>Wikipedia</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
          <section className="mineralLibraryContent">
            {!selectedMineral ? (
              <div className="mineralLibraryEmpty">
                <FontAwesomeIcon icon={faGem} className="mineralLibraryEmptyIcon" />
                <div className="mineralLibraryEmptyTitle">No Mineral Selected</div>
                <div className="mineralLibraryEmptyText">
                  Search and select a mineral from the list to view detailed properties and information.
                </div>
              </div>
            ) : (
              <div className="mineralLibraryDetail">
                <div className="mineralLibraryDetailHead">
                  <div className="mineralLibrarySpecInfo">
                    <div className="mineralLibrarySpecText">
                      <div className="mineralLibrarySpecName">{selectedMineral.title}</div>
                      <div className="mineralLibrarySpecId">Mineral Reference</div>
                    </div>
                  </div>
                  <div className="mineralLibraryExportRow">
                    <button
                      className="mineralLibraryButton mineralLibraryButtonSecondary"
                      onClick={() => window.open(selectedMineral.url, "_blank", "noopener,noreferrer")}
                    >
                      <FontAwesomeIcon icon={faExternalLink} />
                      <span>Wikipedia</span>
                    </button>
                  </div>
                </div>

                {isLoadingDetails ? (
                  <div className="mineralLibraryLoading">
                    <FontAwesomeIcon icon={faSpinner} className="mineralLibraryLoadingSpinner" />
                    <span>Loading detailed information...</span>
                  </div>
                ) : (
                  <div className="mineralLibraryDetailBody">
                    <div className="mineralLibraryOverview">
                      {selectedMineral.thumbnail?.source && (
                        <div className="mineralLibraryImageWrap">
                          <img 
                            src={selectedMineral.thumbnail.source} 
                            alt={`${selectedMineral.title} thumbnail`}
                            className="mineralLibraryImage"
                          />
                        </div>
                      )}
                      
                      <div className="mineralLibrarySections">
                        <div className="mineralLibrarySec">
                          <div className="mineralLibrarySecHead">
                            <div className="mineralLibrarySecIcon">
                              <FontAwesomeIcon icon={faBook} />
                            </div>
                            <div className="mineralLibrarySecTitle">Description</div>
                          </div>
                          <div className="mineralLibraryFields">
                            <div className="mineralLibraryCell">
                              <div className="mineralLibraryCellVal">
                                {selectedMineral.extract}
                              </div>
                            </div>
                          </div>
                        </div>

                        {Object.keys(organizedProperties).length > 0 && (
                          <div className="mineralLibrarySec">
                            <div className="mineralLibrarySecHead">
                              <div className="mineralLibrarySecIcon">
                                <FontAwesomeIcon icon={faFlask} />
                              </div>
                              <div className="mineralLibrarySecTitle">Properties & Characteristics</div>
                            </div>
                            <div className="mineralLibraryFields">
                              {Object.entries(organizedProperties).map(([category, properties]) => (
                                <div key={category} className="mineralLibraryPropertyCategory">
                                  <h4 className="mineralLibraryPropertyCategoryTitle">{category}</h4>
                                  {Object.entries(properties).map(([property, value]) => (
                                    <div key={property} className="mineralLibraryCell">
                                      <div className="mineralLibraryCellKey">{property}</div>
                                      <div className="mineralLibraryCellVal">{value}</div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mineralLibraryFootNote">
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