import { createContext, useContext, useEffect, useState } from 'react';

export type SearchParams = {
  traits?: Trait[];
  keywords?: string;
  priceSymbol?: string;
  priceMin?: string;
  priceMax?: string;
  orderStatus?: string[];
  sortBy?: string;
  collection?: {
    slug: string;
    name?: string;
  };
};

type Trait = {
  traitType: string;
  value: string;
};

type TraitSearchGroup = {
  groupType: 'trait';
  traitType: string;
  traitValue: string;
  onRemove: () => void;
};

type PriceSearchGroup = {
  groupType: 'price';
  min: string;
  max: string;
  symbol: string;
  onRemove: () => void;
};

type CollectionSearchGroup = {
  groupType: 'collection';
  slug: string;
  name: string;
  onRemove: () => void;
};

type KeywordsSearchGroup = {
  groupType: 'keywords';
  keywords: string;
  onRemove: () => void;
};

type SearchGroup =
  | TraitSearchGroup
  | PriceSearchGroup
  | CollectionSearchGroup
  | KeywordsSearchGroup;

export type SearchContextType = {
  search: SearchParams;
  setSearch: (search: SearchParams) => void;
  setSearchParam: <K extends keyof SearchParams>(
    key: K,
    value: SearchParams[K],
  ) => void;
  resetSearch: () => void;
  setPriceMin: (priceMin: string, symbol: string) => void;
  setPriceMax: (priceMax: string, symbol: string) => void;
  setTraits: (traits: Trait[]) => void;
  setKeywords: (keywords?: string) => void;
  setSortBy: (sortBy: string) => void;
  getSearchGroups: () => SearchGroup[];
};

export const SearchContext = createContext<SearchContextType | null>(null);

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [search, setSearch] = useState<SearchParams>({});
  const [isInitialized, setIsInitialized] = useState(false);

  const resetSearch = () => {
    setSearch({});
  };

  const setSearchParam = (
    key: keyof SearchParams,
    value: SearchParams[keyof SearchParams],
  ) => {
    setSearch({ ...search, [key]: value });
  };

  const setPriceMin = (priceMin: string, symbol: string) => {
    setSearch({ ...search, priceMin, priceSymbol: symbol });
  };

  const setPriceMax = (priceMax: string, symbol: string) => {
    setSearch({ ...search, priceMax, priceSymbol: symbol });
  };

  const setTraits = (traits: Trait[]) => {
    setSearch({ ...search, traits });
  };

  const setKeywords = (keywords?: string) => {
    const trimmedKeywords = keywords?.trim();
    if (trimmedKeywords) {
      setSearch({ ...search, keywords: trimmedKeywords });
    } else {
      setSearch({ ...search, keywords: undefined });
    }
  };

  const setSortBy = (sortBy: string) => {
    setSearch({ ...search, sortBy });
  };

  const getSearchGroups = () => {
    const traits = search.traits || [];
    const priceGroup =
      search.priceMin || search.priceMax
        ? ({
            groupType: 'price',
            min: search.priceMin || '0',
            max: search.priceMax || '∞',
            symbol: search.priceSymbol || 'ETH',
            onRemove: () => {
              setSearch({
                ...search,
                priceMin: undefined,
                priceMax: undefined,
                priceSymbol: undefined,
                orderStatus: undefined,
              });
            },
          } as const)
        : undefined;

    const collectionGroup = search.collection
      ? ({
          groupType: 'collection',
          slug: search.collection.slug,
          name: search.collection.name || search.collection.slug,
          onRemove: () => {
            setSearch({ ...search, collection: undefined });
          },
        } as const)
      : undefined;

    return [
      ...(collectionGroup ? [collectionGroup] : []),
      ...(priceGroup ? [priceGroup] : []),
      ...traits.map(
        (trait) =>
          ({
            groupType: 'trait',
            traitType: trait.traitType,
            traitValue: trait.value,
            onRemove: () => {
              setSearch({
                ...search,
                traits: search.traits?.filter(
                  (t) =>
                    !(
                      t.traitType === trait.traitType && t.value === trait.value
                    ),
                ),
              });
            },
          }) as TraitSearchGroup,
      ),
    ];
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search.slice(1));

    const initialSearch = searchParams.get('search');

    if (initialSearch) {
      setSearch(JSON.parse(initialSearch));
    }

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search.slice(1));

    if (
      Object.keys(search).length === 0 ||
      Object.values(search).every((value) => value === undefined)
    ) {
      searchParams.delete('search'); // Remove 'search' from URL if it's empty
    } else {
      searchParams.set('search', JSON.stringify(search));
    }

    window.history.replaceState({}, '', `?${searchParams.toString()}`);
  }, [search]);

  return (
    <SearchContext.Provider
      value={{
        search,
        setSearch,
        setSearchParam,
        resetSearch,
        setPriceMin,
        setPriceMax,
        setTraits,
        setKeywords,
        setSortBy,
        getSearchGroups,
      }}
    >
      {isInitialized ? children : null}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);

  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }

  return context;
};
