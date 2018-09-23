--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
clink.matches = {}
clink.generators = {}

clink.prompt = {}
clink.prompt.filters = {}

--------------------------------------------------------------------------------
function clink.compute_lcd(text, list)
    local list_n = #list
    if list_n < 2 then
        return
    end

    -- Find min and max limits
    local max = 100000
    for i = 1, #list, 1 do
        local j = #(list[i])
        if max > j then
            max = j
        end
    end

    -- For each character in the search range...
    local mid = #text
    local lcd = ""
    for i = 1, max, 1 do
        local same = true
        local l = list[1]:sub(i, i)
        local m = l:lower()

        -- Compare character at the index with each other character in the
        -- other matches.
        for j = 2, list_n, 1 do
            local n = list[j]:sub(i, i):lower()
            if m ~= n then
                same = false
                break
            end
        end

        -- If all characters match then use first match's character.
        if same then
            lcd = lcd..l 
        else
            -- Otherwise use what the user's typed or if we're past that then
            -- bail out.
            if i <= mid then
                lcd = lcd..text:sub(i, i)
            else
                break
            end
        end
    end

    return lcd
end

--------------------------------------------------------------------------------
function clink.is_single_match(matches)
    if #matches <= 1 then
        return true
    end

    local first = matches[1]:lower()
    for i = 2, #matches, 1 do
        if first ~= matches[i]:lower() then
            return false
        end
    end

    return true
end

--------------------------------------------------------------------------------
function clink.is_point_in_quote(str, i)
    if i > #str then
        i = #str
    end

    local c = 1
    local q = string.byte("\"")
    for j = 1, i do
        if string.byte(str, j) == q then
            c = c * -1
        end
    end

    if c < 0 then
        return true
    end

    return false
end

--------------------------------------------------------------------------------
function clink.adjust_for_separator(buffer, point, first, last)
    local seps = nil
    if clink.get_host_process() == "cmd.exe" then
        seps = "|&"
    end

    if seps then
        -- Find any valid command separators and if found, manipulate the
        -- completion state a little bit.
        local leading = buffer:sub(1, first - 1)

        -- regex is: <sep> <not_seps> <eol>
        local regex = "["..seps.."]([^"..seps.."]*)$"
        local sep_found, _, post_sep = leading:find(regex)

        if sep_found and not clink.is_point_in_quote(leading, sep_found) then
            local delta = #leading - #post_sep
            buffer = buffer:sub(delta + 1)
            first = first - delta
            last = last - delta
            point = point - delta

            if first < 1 then
                first = 1
            end
        end
    end

    return buffer, point, first, last
end

--------------------------------------------------------------------------------
function clink.generate_matches(text, first, last)
    local line_buffer
    local point

    line_buffer, point, first, last = clink.adjust_for_separator(
        rl_state.line_buffer,
        rl_state.point,
        first,
        last
    )

    rl_state.line_buffer = line_buffer
    rl_state.point = point

    clink.matches = {}
    clink.match_display_filter = nil

    for _, generator in ipairs(clink.generators) do
        if generator.f(text, first, last) == true then
            if #clink.matches > 1 then
                -- Catch instances where there's many entries of a single match
                if clink.is_single_match(clink.matches) then
                    clink.matches = { clink.matches[1] }
                    return true;
                end

                -- First entry in the match list should be the user's input,
                -- modified here to be the lowest common denominator.
                local lcd = clink.compute_lcd(text, clink.matches)
                table.insert(clink.matches, 1, lcd)
            end

            return true
        end
    end

    return false
end

--------------------------------------------------------------------------------
function clink.add_match(match)
    if type(match) == "table" then
        for _, i in ipairs(match) do
            table.insert(clink.matches, i)
        end

        return
    end

    table.insert(clink.matches, match)
end

--------------------------------------------------------------------------------
function clink.register_match_generator(func, priority)
    if priority == nil then
        priority = 999
    end

    table.insert(clink.generators, {f=func, p=priority})
    table.sort(clink.generators, function(a, b) return a["p"] < b["p"] end)
end

--------------------------------------------------------------------------------
function clink.is_match(needle, candidate)
    if needle == nil then
        error("Nil needle value when calling clink.is_match()", 2)
    end

    if clink.lower(candidate:sub(1, #needle)) == clink.lower(needle) then
        return true
    end
    return false
end

--------------------------------------------------------------------------------
function clink.match_count()
    return #clink.matches
end

--------------------------------------------------------------------------------
function clink.set_match(i, value)
    clink.matches[i] = value
end

--------------------------------------------------------------------------------
function clink.get_match(i)
    return clink.matches[i]
end

--------------------------------------------------------------------------------
function clink.match_words(text, words)
    local count = clink.match_count()

    for _, i in ipairs(words) do
        if clink.is_match(text, i) then
            clink.add_match(i)
        end
    end

    return clink.match_count() - count
end

--------------------------------------------------------------------------------
function clink.match_files(pattern, full_path, find_func)
    -- Fill out default values
    if type(find_func) ~= "function" then
        find_func = clink.find_files
    end

    if full_path == nil then
        full_path = true
    end

    if pattern == nil then
        pattern = "*"
    end

    -- Glob files.
    pattern = pattern:gsub("/", "\\")
    local glob = find_func(pattern, true)

    -- Get glob's base.
    local base = ""
    local i = pattern:find("[\\:][^\\:]*$")
    if i and full_path then
        base = pattern:sub(1, i)
    end

    -- Match them.
    local count = clink.match_count()

    for _, i in ipairs(glob) do
        local full = base..i
        clink.add_match(full)
    end

    return clink.match_count() - count
end

--------------------------------------------------------------------------------
function clink.split(str, sep)
    local i = 1
    local ret = {}
    for _, j in function() return str:find(sep, i, true) end do
        table.insert(ret, str:sub(i, j - 1))
        i = j + 1
    end
    table.insert(ret, str:sub(i, j))

    return ret
end

--------------------------------------------------------------------------------
function clink.quote_split(str, ql, qr)
    if not qr then
        qr = ql
    end

    -- First parse in "pre[ql]quote_string[qr]" chunks
    local insert = table.insert
    local i = 1
    local needle = "%b"..ql..qr
    local parts = {}
    for l, r, quote in function() return str:find(needle, i) end do
        -- "pre"
        if l > 1 then
            insert(parts, str:sub(i, l - 1))
        end

        -- "quote_string"
        insert(parts, str:sub(l, r))
        i = r + 1
    end

    -- Second parse what remains as "pre[ql]being_quoted"
    local l = str:find(ql, i, true)
    if l then
        -- "pre"
        if l > 1 then
            insert(parts, str:sub(i, l - 1))
        end

        -- "being_quoted"
        insert(parts, str:sub(l))
    elseif i <= #str then
        -- Finally add whatever remains...
        insert(parts, str:sub(i))
    end

    return parts
end

--------------------------------------------------------------------------------
function clink.prompt.register_filter(filter, priority)
    if priority == nil then
        priority = 999
    end

    table.insert(clink.prompt.filters, {f=filter, p=priority})
    table.sort(clink.prompt.filters, function(a, b) return a["p"] < b["p"] end)
end

--------------------------------------------------------------------------------
function clink.filter_prompt(prompt)
    local function add_ansi_codes(p)
        local c = tonumber(clink.get_setting_int("prompt_colour"))
        if c < 0 then
            return p
        end

        c = c % 16

        --[[
            <4              >=4             %2
            0 0  0 Black    4 1 -3 Blue     0
            1 4  3 Red      5 5  0 Magenta  1
            2 2  0 Green    6 3 -3 Cyan     0
            3 6  3 Yellow   7 7  0 Gray     1
        --]]

        -- Convert from cmd.exe colour indices to ANSI ones.
        local colour_id = c % 8
        if (colour_id % 2) == 1 then
            if colour_id < 4 then
                c = c + 3
            end
        elseif colour_id >= 4 then
            c = c - 3
        end

        -- Clamp
        if c > 15 then
            c = 15
        end

        -- Build ANSI code
        local code = "\x1b[0;"
        if c > 7 then
            c = c - 8
            code = code.."1;"
        end
        code = code..(c + 30).."m"

        return code..p.."\x1b[0m"
    end

    clink.prompt.value = prompt

    for _, filter in ipairs(clink.prompt.filters) do
        if filter.f() == true then
            return add_ansi_codes(clink.prompt.value)
        end
    end

    return add_ansi_codes(clink.prompt.value)
end

-- vim: expandtab
--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
clink.arg = {}

--------------------------------------------------------------------------------
local parsers               = {}
local is_parser
local is_sub_parser
local new_sub_parser
local parser_go_impl
local merge_parsers

local parser_meta_table     = {}
local sub_parser_meta_table = {}

--------------------------------------------------------------------------------
function parser_meta_table.__concat(lhs, rhs)
    if not is_parser(rhs) then
        error("Right-handside must be parser.", 2)
    end

    local t = type(lhs)
    if t == "table" then
        local ret = {}
        for _, i in ipairs(lhs) do
            table.insert(ret, i .. rhs)
        end

        return ret
    elseif t ~= "string" then
        error("Left-handside must be a string or a table.", 2)
    end

    return new_sub_parser(lhs, rhs)
end

--------------------------------------------------------------------------------
local function unfold_table(source, target)
    for _, i in ipairs(source) do
        if type(i) == "table" and getmetatable(i) == nil then
            unfold_table(i, target)
        else
            table.insert(target, i)
        end
    end
end

--------------------------------------------------------------------------------
local function parser_is_flag(parser, part)
    if part == nil then
        return false
    end

    local prefix = part:sub(1, 1)
    return prefix == "-" or prefix == "/"
end

--------------------------------------------------------------------------------
local function parser_add_arguments(parser, ...)
    for _, i in ipairs({...}) do
        -- Check all arguments are tables.
        if type(i) ~= "table" then
            error("All arguments to add_arguments() must be tables.", 2)
        end

        -- Only parsers are allowed to be specified without being wrapped in a
        -- containing table.
        if getmetatable(i) ~= nil then
            if is_parser(i) then
                table.insert(parser.arguments, i)
            else
                error("Tables can't have meta-tables.", 2)
            end
        else
            -- Expand out nested tables and insert into object's arguments table.
            local arguments = {}
            unfold_table(i, arguments)
            table.insert(parser.arguments, arguments)
        end
    end

    return parser
end

--------------------------------------------------------------------------------
local function parser_set_arguments(parser, ...)
    parser.arguments = {}
    return parser:add_arguments(...)
end

--------------------------------------------------------------------------------
local function parser_add_flags(parser, ...)
    local flags = {}
    unfold_table({...}, flags)

    -- Validate the specified flags.
    for _, i in ipairs(flags) do
        if is_sub_parser(i) then
            i = i.key
        end

        -- Check all flags are strings.
        if type(i) ~= "string" then
            error("All parser flags must be strings. Found "..type(i), 2)
        end

        -- Check all flags start with a - or a /
        if not parser:is_flag(i) then
            error("Flags must begin with a '-' or a '/'", 2)
        end
    end

    -- Append flags to parser's existing table of flags.
    for _, i in ipairs(flags) do
        table.insert(parser.flags, i)
    end

    return parser
end

--------------------------------------------------------------------------------
local function parser_set_flags(parser, ...)
    parser.flags = {}
    return parser:add_flags(...)
end

--------------------------------------------------------------------------------
local function parser_flatten_argument(parser, index, func_thunk)
    -- Sanity check the 'index' param to make sure it's valid.
    if type(index) == "number" then
        if index <= 0 or index > #parser.arguments then
            return parser.use_file_matching
        end
    end

    -- index == nil is a special case that returns the parser's flags
    local opts = {}
    local arg_opts
    if index == nil then
        arg_opts = parser.flags
    else
        arg_opts = parser.arguments[index]
    end

    -- Convert each argument option into a string and collect them in a table.
    for _, i in ipairs(arg_opts) do
        if is_sub_parser(i) then
            table.insert(opts, i.key)
        else
            local t = type(i)
            if t == "function" then
                local results = func_thunk(i)
                local t = type(results)
                if not results then
                    return parser.use_file_matching
                elseif t == "boolean" then
                    return (results and parser.use_file_matching)
                elseif t == "table" then
                    for _, j in ipairs(results) do
                        table.insert(opts, j)
                    end
                end
            elseif t == "string" or t == "number" then
                table.insert(opts, tostring(i))
            end
        end
    end

    return opts
end

--------------------------------------------------------------------------------
local function parser_go_args(parser, state)
    local exhausted_args = false
    local exhausted_parts = false

    local part = state.parts[state.part_index]
    local arg_index = state.arg_index
    local arg_opts = parser.arguments[arg_index]
    local arg_count = #parser.arguments

    -- Is the next argument a parser? Parse control directly on to it.
    if is_parser(arg_opts) then
        state.arg_index = 1
        return parser_go_impl(arg_opts, state)
    end

    -- Advance parts state.
    state.part_index = state.part_index + 1
    if state.part_index > #state.parts then
        exhausted_parts = true
    end

    -- Advance argument state.
    state.arg_index = arg_index + 1
    if arg_index > arg_count then
        exhausted_args = true
    end

    -- We've exhausted all available arguments. We either loop or we're done.
    if parser.loop_point > 0 and state.arg_index > arg_count then
        state.arg_index = parser.loop_point
        if state.arg_index > arg_count then
            state.arg_index = arg_count
        end
    end

    -- Is there some state to process?
    if not exhausted_parts and not exhausted_args then
        local exact = false
        for _, arg_opt in ipairs(arg_opts) do
            -- Is the argument a key to a sub-parser? If so then hand control
            -- off to it.
            if is_sub_parser(arg_opt) then
                if arg_opt.key == part then
                    state.arg_index = 1
                    return parser_go_impl(arg_opt.parser, state)
                end
            end

            -- Check so see if the part has an exact match in the argument. Note
            -- that only string-type options are considered.
            if type(arg_opt) == "string" then
                exact = exact or arg_opt == part
            else
                exact = true
            end
        end

        -- If the parser's required to be precise then check here.
        if parser.precise and not exact then
            exhausted_args = true
        else
            return nil
        end
    end

    -- If we've no more arguments to traverse but there's still parts remaining
    -- then we start skipping arguments but keep going so that flags still get
    -- parsed (as flags have no position).
    if exhausted_args then
        state.part_index = state.part_index - 1

        if not exhausted_parts then
            if state.depth <= 1 then
                state.skip_args = true
                return
            end

            return parser.use_file_matching
        end
    end

    -- Now we've an index into the parser's arguments that matches the line
    -- state. Flatten it.
    local func_thunk = function(func)
        return func(part)
    end

    return parser:flatten_argument(arg_index, func_thunk)
end

--------------------------------------------------------------------------------
local function parser_go_flags(parser, state)
    local part = state.parts[state.part_index]

    -- Advance parts state.
    state.part_index = state.part_index + 1
    if state.part_index > #state.parts then
        return parser:flatten_argument()
    end

    for _, arg_opt in ipairs(parser.flags) do
        if is_sub_parser(arg_opt) then
            if arg_opt.key == part then
                local arg_index_cache = state.arg_index
                local skip_args_cache = state.skip_args

                state.arg_index = 1
                state.skip_args = false
                state.depth = state.depth + 1

                local ret = parser_go_impl(arg_opt.parser, state)
                if type(ret) == "table" then
                    return ret
                end

                state.depth = state.depth - 1
                state.skip_args = skip_args_cache
                state.arg_index = arg_index_cache
            end
        end
    end
end

--------------------------------------------------------------------------------
function parser_go_impl(parser, state)
    local has_flags = #parser.flags > 0

    while state.part_index <= #state.parts do
        local part = state.parts[state.part_index]
        local dispatch_func

        if has_flags and parser:is_flag(part) then
            dispatch_func = parser_go_flags
        elseif not state.skip_args then
            dispatch_func = parser_go_args
        end

        if dispatch_func ~= nil then
            local ret = dispatch_func(parser, state)
            if ret ~= nil then
                return ret
            end
        else
            state.part_index = state.part_index + 1
        end
    end

    return parser.use_file_matching
end

--------------------------------------------------------------------------------
local function parser_go(parser, parts)
    -- Validate 'parts'.
    if type(parts) ~= "table" then
        error("'Parts' param must be a table of strings ("..type(parts)..").", 2)
    else
        if #parts == 0 then
            part = { "" }
        end

        for i, j in ipairs(parts) do
            local t = type(parts[i])
            if t ~= "string" then
                error("'Parts' table can only contain strings; "..j.."="..t, 2)
            end
        end
    end

    local state = {
        arg_index = 1,
        part_index = 1,
        parts = parts,
        skip_args = false,
        depth = 1,
    }

    return parser_go_impl(parser, state)
end

--------------------------------------------------------------------------------
local function parser_dump(parser, depth)
    if depth == nil then
        depth = 0
    end

    function prt(depth, index, text)
        local indent = string.sub("                                 ", 1, depth)
        text = tostring(text)
        print(indent..depth.."."..index.." - "..text)
    end

    -- Print arguments
    local i = 0
    for _, arg_opts in ipairs(parser.arguments) do
        for _, arg_opt in ipairs(arg_opts) do
            if is_sub_parser(arg_opt) then
                prt(depth, i, arg_opt.key)
                arg_opt.parser:dump(depth + 1)
            else
                prt(depth, i, arg_opt)
            end
        end

        i = i + 1
    end

    -- Print flags
    for _, flag in ipairs(parser.flags) do
        prt(depth, "F", flag)
    end
end

--------------------------------------------------------------------------------
function parser_be_precise(parser)
    parser.precise = true
    return parser
end

--------------------------------------------------------------------------------
function is_parser(p)
    return type(p) == "table" and getmetatable(p) == parser_meta_table
end

--------------------------------------------------------------------------------
function is_sub_parser(sp)
    return type(sp) == "table" and getmetatable(sp) == sub_parser_meta_table
end

--------------------------------------------------------------------------------
local function get_sub_parser(argument, str)
    for _, arg in ipairs(argument) do
        if is_sub_parser(arg) then
            if arg.key == str then
                return arg.parser
            end
        end
    end
end

--------------------------------------------------------------------------------
function new_sub_parser(key, parser)
    local sub_parser = {}
    sub_parser.key = key
    sub_parser.parser = parser

    setmetatable(sub_parser, sub_parser_meta_table)
    return sub_parser
end

--------------------------------------------------------------------------------
local function parser_disable_file_matching(parser)
    parser.use_file_matching = false
    return parser
end

--------------------------------------------------------------------------------
local function parser_loop(parser, loop_point)
    if loop_point == nil or type(loop_point) ~= "number" or loop_point < 1 then
        loop_point = 1
    end

    parser.loop_point = loop_point
    return parser
end

--------------------------------------------------------------------------------
local function parser_initialise(parser, ...)
    for _, word in ipairs({...}) do
        local t = type(word)
        if t == "string" then
            parser:add_flags(word)
        elseif t == "table" then
            if is_sub_parser(word) and parser_is_flag(nil, word.key) then
                parser:add_flags(word)
            else
                parser:add_arguments(word)
            end
        else
            error("Additional arguments to new_parser() must be tables or strings", 2)
        end
    end
end

--------------------------------------------------------------------------------
function clink.arg.new_parser(...)
    local parser = {}

    -- Methods
    parser.set_flags = parser_set_flags
    parser.add_flags = parser_add_flags
    parser.set_arguments = parser_set_arguments
    parser.add_arguments = parser_add_arguments
    parser.dump = parser_dump
    parser.go = parser_go
    parser.flatten_argument = parser_flatten_argument
    parser.be_precise = parser_be_precise
    parser.disable_file_matching = parser_disable_file_matching
    parser.loop = parser_loop
    parser.is_flag = parser_is_flag

    -- Members.
    parser.flags = {}
    parser.arguments = {}
    parser.precise = false
    parser.use_file_matching = true
    parser.loop_point = 0

    setmetatable(parser, parser_meta_table)

    -- If any arguments are provided treat them as parser's arguments or flags
    if ... then
        success, msg = pcall(parser_initialise, parser, ...)
        if not success then
            error(msg, 2)
        end
    end

    return parser
end

--------------------------------------------------------------------------------
function merge_parsers(lhs, rhs)
    -- Merging parsers is not a trivial matter and this implementation is far
    -- from correct. It is however sufficient for the majority of cases.

    -- Merge flags.
    for _, rflag in ipairs(rhs.flags) do
        table.insert(lhs.flags, rflag)
    end

    -- Remove (and save value of) the first argument in RHS.
    local rhs_arg_1 = table.remove(rhs.arguments, 1)
    if rhs_arg_1 == nil then
        return
    end

    -- Get reference to the LHS's first argument table (creating it if needed).
    local lhs_arg_1 = lhs.arguments[1]
    if lhs_arg_1 == nil then
        lhs_arg_1 = {}
        table.insert(lhs.arguments, lhs_arg_1)
    end

    -- Link RHS to LHS through sub-parsers.
    for _, rarg in ipairs(rhs_arg_1) do
        local child

        -- Split sub parser
        if is_sub_parser(rarg) then
            child = rarg.parser     
            rarg = rarg.key
        else
            child = rhs
        end

        -- If LHS's first argument has rarg in it which links to a sub-parser
        -- then we need to recursively merge them.
        local lhs_sub_parser = get_sub_parser(lhs_arg_1, rarg)
        if lhs_sub_parser then
            merge_parsers(lhs_sub_parser, child)
        else
            local to_add = rarg
            if type(rarg) ~= "function" then
                to_add = rarg .. child
            end

            table.insert(lhs_arg_1, to_add)
        end
    end
end

--------------------------------------------------------------------------------
function clink.arg.register_parser(cmd, parser)
    if not is_parser(parser) then
        local p = clink.arg.new_parser()
        p:set_arguments({ parser })
        parser = p
    end

    cmd = cmd:lower()
    local prev = parsers[cmd]
    if prev ~= nil then
        merge_parsers(prev, parser)
    else
        parsers[cmd] = parser
    end
end

--------------------------------------------------------------------------------
local function argument_match_generator(text, first, last)
    local leading = rl_state.line_buffer:sub(1, first - 1):lower()

    -- Extract the command.
    local cmd_l, cmd_r
    if leading:find("^%s*\"") then
        -- Command appears to be surround by quotes.
        cmd_l, cmd_r = leading:find("%b\"\"")
        if cmd_l and cmd_r then
            cmd_l = cmd_l + 1
            cmd_r = cmd_r - 1
        end
    else
        -- No quotes so the first, longest, non-whitespace word is extracted.
        cmd_l, cmd_r = leading:find("[^%s]+")
    end

    if not cmd_l or not cmd_r then
        return false
    end

    local regex = "[\\/:]*([^\\/:.]+)(%.*[%l]*)%s*$"
    local _, _, cmd, ext = leading:sub(cmd_l, cmd_r):lower():find(regex)

    -- Check to make sure the extension extracted is in pathext.
    if ext and ext ~= "" then
        if not clink.get_env("pathext"):lower():match(ext.."[;$]", 1, true) then
            return false
        end
    end
    
    -- Find a registered parser.
    local parser = parsers[cmd]
    if parser == nil then
        return false
    end

    -- Split the command line into parts.
    local str = rl_state.line_buffer:sub(cmd_r + 2, last)
    local parts = {}
    for _, sub_str in ipairs(clink.quote_split(str, "\"")) do
        -- Quoted strings still have their quotes. Look for those type of
        -- strings, strip the quotes and add it completely.
        if sub_str:sub(1, 1) == "\"" then
            local l, r = sub_str:find("\"[^\"]+")
            if l then
                local part = sub_str:sub(l + 1, r)
                table.insert(parts, part)
            end
        else
            -- Extract non-whitespace parts.
            for _, r, part in function () return sub_str:find("^%s*([^%s]+)") end do
                table.insert(parts, part)
                sub_str = sub_str:sub(r + 1)
            end
        end
    end

    -- If 'text' is empty then add it as a part as it would have been skipped
    -- by the split loop above.
    if text == "" then
        table.insert(parts, text)
    end

    -- Extend rl_state with match generation state; text, first, and last.
    rl_state.text = text
    rl_state.first = first
    rl_state.last = last

    -- Call the parser.
    local needle = parts[#parts]
    local ret = parser:go(parts)
    if type(ret) ~= "table" then
        return not ret
    end

    -- Iterate through the matches the parser returned and collect matches.
    for _, match in ipairs(ret) do
        if clink.is_match(needle, match) then
            clink.add_match(match)
        end
    end

    return true
end

--------------------------------------------------------------------------------
clink.register_match_generator(argument_match_generator, 25)

-- vim: expandtab

--{{{  history

--15/03/06 DCN Created based on RemDebug
--28/04/06 DCN Update for Lua 5.1
--01/06/06 DCN Fix command argument parsing
--             Add step/over N facility
--             Add trace lines facility
--05/06/06 DCN Add trace call/return facility
--06/06/06 DCN Make it behave when stepping through the creation of a coroutine
--06/06/06 DCN Integrate the simple debugger into the main one
--07/06/06 DCN Provide facility to step into coroutines
--13/06/06 DCN Fix bug that caused the function environment to get corrupted with the global one
--14/06/06 DCN Allow 'sloppy' file names when setting breakpoints
--04/08/06 DCN Allow for no space after command name
--11/08/06 DCN Use io.write not print
--30/08/06 DCN Allow access to array elements in 'dump'
--10/10/06 DCN Default to breakfile for all commands that require a filename and give '-'
--06/12/06 DCN Allow for punctuation characters in DUMP variable names
--03/01/07 DCN Add pause on/off facility
--19/06/07 DCN Allow for duff commands being typed in the debugger (thanks to Michael.Bringmann@lsi.com)
--             Allow for case sensitive file systems               (thanks to Michael.Bringmann@lsi.com)
--04/08/09 DCN Add optional line count param to pause
--05/08/09 DCN Reset the debug hook in Pause() even if we think we're started
--30/09/09 DCN Re-jig to not use co-routines (makes debugging co-routines awkward)
--01/10/09 DCN Add ability to break on reaching any line in a file
--24/07/13 TWW Added code for emulating setfenv/getfenv in Lua 5.2 as per
--             http://lua-users.org/lists/lua-l/2010-06/msg00313.html
--25/07/13 TWW Copied Alex Parrill's fix for errors when tracing back across a C frame
--             (https://github.com/ColonelThirtyTwo/clidebugger, 26/01/12)
--25/07/13 DCN Allow for windows and unix file name conventions in has_breakpoint
--26/07/13 DCN Allow for \ being interpreted as an escape inside a [] pattern in 5.2

--}}}
--{{{  description

--A simple command line debug system for Lua written by Dave Nichols of
--Match-IT Limited. Its public domain software. Do with it as you wish.

--This debugger was inspired by:
-- RemDebug 1.0 Beta
-- Copyright Kepler Project 2005 (http://www.keplerproject.org/remdebug)

--Usage:
--  require('debugger')        --load the debug library
--  pause(message)             --start/resume a debug session

--An assert() failure will also invoke the debugger.

--}}}

local IsWindows = string.find(string.lower(os.getenv('OS') or ''),'^windows')

local coro_debugger
local events = { BREAK = 1, WATCH = 2, STEP = 3, SET = 4 }
local breakpoints = {}
local watches = {}
local step_into   = false
local step_over   = false
local step_lines  = 0
local step_level  = {main=0}
local stack_level = {main=0}
local trace_level = {main=0}
local trace_calls = false
local trace_returns = false
local trace_lines = false
local ret_file, ret_line, ret_name
local current_thread = 'main'
local started = false
local pause_off = false
local _g      = _G
local cocreate, cowrap = coroutine.create, coroutine.wrap
local pausemsg = 'pause'

local aliases = {
    p = "over",
    t = "step",
    q = "exit",
    g = "run",
    dv = "dump",
    dt = "locs",
    k = "trace",
    bp = "setb",
    bc = "delb",
    bl = "listb",
    pt = "out",
}

--{{{  make Lua 5.2 compatible

if not setfenv then -- Lua 5.2
  --[[
  As far as I can see, the only missing detail of these functions (except
  for occasional bugs) to achieve 100% compatibility is the case of
  'getfenv' over a function that does not have an _ENV variable (that is,
  it uses no globals).

  We could use a weak table to keep the environments of these functions
  when set by setfenv, but that still misses the case of a function
  without _ENV that was not subjected to setfenv.

  -- Roberto
  ]]--

  setfenv = setfenv or function(f, t)
    f = (type(f) == 'function' and f or debug.getinfo(f + 1, 'f').func)
    local name
    local up = 0
    repeat
      up = up + 1
      name = debug.getupvalue(f, up)
    until name == '_ENV' or name == nil
    if name then
      debug.upvaluejoin(f, up, function() return name end, 1) -- use unique upvalue
      debug.setupvalue(f, up, t)
    end
  end

  getfenv = getfenv or function(f)
    f = (type(f) == 'function' and f or debug.getinfo(f + 1, 'f').func)
    local name, val
    local up = 0
    repeat
      up = up + 1
      name, val = debug.getupvalue(f, up)
    until name == '_ENV' or name == nil
    return val
  end

  unpack = table.unpack

end

--}}}

--{{{  local hints -- command help
--The format in here is name=summary|description
local hints = {

pause =   [[
pause(msg[,lines][,force]) -- start/resume a debugger session|

This can only be used in your code or from the console as a means to
start/resume a debug session.
If msg is given that is shown when the session starts/resumes. Useful to
give a context if you've instrumented your code with pause() statements.

If lines is given, the script pauses after that many lines, else it pauses
immediately.

If force is true, the pause function is honoured even if poff has been used.
This is useful when in an interactive console session to regain debugger
control.
]],

poff =    [[
poff                -- turn off pause() command|

This causes all pause() commands to be ignored. This is useful if you have
instrumented your code in a busy loop and want to continue normal execution
with no further interruption.
]],

pon =     [[
pon                 -- turn on pause() command|

This re-instates honouring the pause() commands you may have instrumented
your code with.
]],

setb =    [[
setb [line file]    -- set a breakpoint to line/file|, line 0 means 'any'

If file is omitted or is "-" the breakpoint is set at the file for the
currently set level (see "set"). Execution pauses when this line is about
to be executed and the debugger session is re-activated.

The file can be given as the fully qualified name, partially qualified or
just the file name. E.g. if file is set as "myfile.lua", then whenever
execution reaches any file that ends with "myfile.lua" it will pause. If
no extension is given, any extension will do.

If the line is given as 0, then reaching any line in the file will do.
]],

delb =    [[
delb [line file]    -- removes a breakpoint|

If file is omitted or is "-" the breakpoint is removed for the file of the
currently set level (see "set").
]],

delallb = [[
delallb             -- removes all breakpoints|
]],

setw =    [[
setw <exp>          -- adds a new watch expression|

The expression is evaluated before each line is executed. If the expression
yields true then execution is paused and the debugger session re-activated.
The expression is executed in the context of the line about to be executed.
]],

delw =    [[
delw <index>        -- removes the watch expression at index|

The index is that returned when the watch expression was set by setw.
]],

delallw = [[
delallw             -- removes all watch expressions|
]],

run     = [[
run                 -- run until next breakpoint or watch expression|
]],

step    = [[
step [N]            -- run next N lines, stepping into function calls|

If N is omitted, use 1.
]],

over    = [[
over [N]            -- run next N lines, stepping over function calls|

If N is omitted, use 1.
]],

out     = [[
out [N]             -- run lines until stepped out of N functions|

If N is omitted, use 1.
If you are inside a function, using "out 1" will run until you return
from that function to the caller.
]],

gotoo   = [[
gotoo [line file]    -- step to line in file|

This is equivalent to 'setb line file', followed by 'run', followed
by 'delb line file'.
]],

listb   = [[
listb               -- lists breakpoints|
]],

listw   = [[
listw               -- lists watch expressions|
]],

set     = [[
set [level]         -- set context to stack level, omitted=show|

If level is omitted it just prints the current level set.
This sets the current context to the level given. This affects the
context used for several other functions (e.g. vars). The possible
levels are those shown by trace.
]],

vars    = [[
vars [depth]        -- list context locals to depth, omitted=1|

If depth is omitted then uses 1.
Use a depth of 0 for the maximum.
Lists all non-nil local variables and all non-nil upvalues in the
currently set context. For variables that are tables, lists all fields
to the given depth.
]],

fenv    = [[
fenv [depth]        -- list context function env to depth, omitted=1|

If depth is omitted then uses 1.
Use a depth of 0 for the maximum.
Lists all function environment variables in the currently set context.
For variables that are tables, lists all fields to the given depth.
]],

glob    = [[
glob [depth]        -- list globals to depth, omitted=1|

If depth is omitted then uses 1.
Use a depth of 0 for the maximum.
Lists all global variables.
For variables that are tables, lists all fields to the given depth.
]],

ups     = [[
ups                 -- list all the upvalue names|

These names will also be in the "vars" list unless their value is nil.
This provides a means to identify which vars are upvalues and which are
locals. If a name is both an upvalue and a local, the local value takes
precedance.
]],

locs    = [[
locs                -- list all the locals names|

These names will also be in the "vars" list unless their value is nil.
This provides a means to identify which vars are upvalues and which are
locals. If a name is both an upvalue and a local, the local value takes
precedance.
]],

dump    = [[
dump <var> [depth]  -- dump all fields of variable to depth|

If depth is omitted then uses 1.
Use a depth of 0 for the maximum.
Prints the value of <var> in the currently set context level. If <var>
is a table, lists all fields to the given depth. <var> can be just a
name, or name.field or name.# to any depth, e.g. t.1.f accesses field
'f' in array element 1 in table 't'.

Can also be called from a script as dump(var,depth).
]],

tron    = [[
tron [crl]          -- turn trace on for (c)alls, (r)etuns, (l)lines|

If no parameter is given then tracing is turned off.
When tracing is turned on a line is printed to the console for each
debug 'event' selected. c=function calls, r=function returns, l=lines.
]],

trace   = [[
trace               -- dumps a stack trace|

Format is [level] = file,line,name
The level is a candidate for use by the 'set' command.
]],

info    = [[
info                -- dumps the complete debug info captured|

Only useful as a diagnostic aid for the debugger itself. This information
can be HUGE as it dumps all variables to the maximum depth, so be careful.
]],

show    = [[
show line file X Y  -- show X lines before and Y after line in file|

If line is omitted or is '-' then the current set context line is used.
If file is omitted or is '-' then the current set context file is used.
If file is not fully qualified and cannot be opened as specified, then
a search for the file in the package[path] is performed using the usual
"require" searching rules. If no file extension is given, .lua is used.
Prints the lines from the source file around the given line.
]],

exit    = [[
exit                -- exits debugger, re-start it using pause()|
]],

help    = [[
help [command]      -- show this list or help for command|
]],

["<statement>"] = [[
<statement>         -- execute a statement in the current context|

The statement can be anything that is legal in the context, including
assignments. Such assignments affect the context and will be in force
immediately. Any results returned are printed. Use '=' as a short-hand
for 'return', e.g. "=func(arg)" will call 'func' with 'arg' and print
the results, and "=var" will just print the value of 'var'.
]],

what    = [[
what <func>         -- show where <func> is defined (if known)|
]],

}
--}}}

--{{{  local function getinfo(level,field)

--like debug.getinfo but copes with no activation record at the given level
--and knows how to get 'field'. 'field' can be the name of any of the
--activation record fields or any of the 'what' names or nil for everything.
--only valid when using the stack level to get info, not a function name.

local function getinfo(level,field)
  level = level + 1  --to get to the same relative level as the caller
  if not field then return debug.getinfo(level) end
  local what
  if field == 'name' or field == 'namewhat' then
    what = 'n'
  elseif field == 'what' or field == 'source' or field == 'linedefined' or field == 'lastlinedefined' or field == 'short_src' then
    what = 'S'
  elseif field == 'currentline' then
    what = 'l'
  elseif field == 'nups' then
    what = 'u'
  elseif field == 'func' then
    what = 'f'
  else
    return debug.getinfo(level,field)
  end
  local ar = debug.getinfo(level,what)
  if ar then return ar[field] else return nil end
end

--}}}
--{{{  local function indented( level, ... )

local function indented( level, ... )
  io.write( string.rep('  ',level), table.concat({...}), '\n' )
end

--}}}
--{{{  local function dumpval( level, name, value, limit )

local dumpvisited

local function dumpval( level, name, value, limit )
  local index
  if type(name) == 'number' then
    index = string.format('[%d] = ',name)
  elseif type(name) == 'string'
     and (name == '__VARSLEVEL__' or name == '__ENVIRONMENT__' or name == '__GLOBALS__' or name == '__UPVALUES__' or name == '__LOCALS__') then
    --ignore these, they are debugger generated
    return
  elseif type(name) == 'string' and string.find(name,'^[_%a][_.%w]*$') then
    index = name ..' = '
  else
    index = string.format('[%q] = ',tostring(name))
  end
  if type(value) == 'table' then
    if dumpvisited[value] then
      indented( level, index, string.format('ref%q;',dumpvisited[value]) )
    else
      dumpvisited[value] = tostring(value)
      if (limit or 0) > 0 and level+1 >= limit then
        indented( level, index, dumpvisited[value] )
      else
        indented( level, index, '{  -- ', dumpvisited[value] )
        for n,v in pairs(value) do
          dumpval( level+1, n, v, limit )
        end
        indented( level, '};' )
      end
    end
  else
    if type(value) == 'string' then
      if string.len(value) > 40 then
        indented( level, index, '[[', value, ']];' )
      else
        indented( level, index, string.format('%q',value), ';' )
      end
    else
      indented( level, index, tostring(value), ';' )
    end
  end
end

--}}}
--{{{  local function dumpvar( value, limit, name )

local function dumpvar( value, limit, name )
  dumpvisited = {}
  dumpval( 0, name or tostring(value), value, limit )
end

--}}}
--{{{  local function show(file,line,before,after)

--show +/-N lines of a file around line M

local function show(file,line,before,after)

  line   = tonumber(line   or 1)
  before = tonumber(before or 10)
  after  = tonumber(after  or before)

  if not string.find(file,'%.') then file = file..'.lua' end

  local f = io.open(file,'r')
  if not f then
    --{{{  try to find the file in the path
    
    --
    -- looks for a file in the package path
    --
    local path = package.path or LUA_PATH or ''
    for c in string.gmatch (path, "[^;]+") do
      local c = string.gsub (c, "%?%.lua", file)
      f = io.open (c,'r')
      if f then
        break
      end
    end
    
    --}}}
    if not f then
      io.write('Cannot find '..file..'\n')
      return
    end
  end

  local i = 0
  for l in f:lines() do
    i = i + 1
    if i >= (line-before) then
      if i > (line+after) then break end
      if i == line then
        io.write(i..'***\t'..l..'\n')
      else
        io.write(i..'\t'..l..'\n')
      end
    end
  end

  f:close()

end

--}}}
--{{{  local function tracestack(l)

local function gi( i )
  return function() i=i+1 return debug.getinfo(i),i end
end

local function gl( level, j )
  return function() j=j+1 return debug.getlocal( level, j ) end
end

local function gu( func, k )
  return function() k=k+1 return debug.getupvalue( func, k ) end
end

local  traceinfo

local function tracestack(l)
  local l = l + 1                        --NB: +1 to get level relative to caller
  traceinfo = {}
  traceinfo.pausemsg = pausemsg
  for ar,i in gi(l) do
    table.insert( traceinfo, ar )
    if ar.what ~= 'C' then
      local names  = {}
      local values = {}
      for n,v in gl(i,0) do
        if string.sub(n,1,1) ~= '(' then   --ignore internal control variables
          table.insert( names, n )
          table.insert( values, v )
        end
      end
      if #names > 0 then
        ar.lnames  = names
        ar.lvalues = values
      end
    end
    if ar.func then
      local names  = {}
      local values = {}
      for n,v in gu(ar.func,0) do
        if string.sub(n,1,1) ~= '(' then   --ignore internal control variables
          table.insert( names, n )
          table.insert( values, v )
        end
      end
      if #names > 0 then
        ar.unames  = names
        ar.uvalues = values
      end
    end
  end
end

--}}}
--{{{  local function trace()

local function trace(set)
  local mark
  for level,ar in ipairs(traceinfo) do
    if level == set then
      mark = '***'
    else
      mark = ''
    end
    io.write('['..level..']'..mark..'\t'..(ar.name or ar.what)..' in '..ar.short_src..':'..ar.currentline..'\n')
  end
end

--}}}
--{{{  local function info()

local function info() dumpvar( traceinfo, 0, 'traceinfo' ) end

--}}}

--{{{  local function set_breakpoint(file, line, once)

local function set_breakpoint(file, line, once)
  if not breakpoints[line] then
    breakpoints[line] = {}
  end
  if once then
    breakpoints[line][file] = 1
  else
    breakpoints[line][file] = true
  end
end

--}}}
--{{{  local function remove_breakpoint(file, line)

local function remove_breakpoint(file, line)
  if breakpoints[line] then
    breakpoints[line][file] = nil
  end
end

--}}}
--{{{  local function has_breakpoint(file, line)

--allow for 'sloppy' file names
--search for file and all variations walking up its directory hierachy
--ditto for the file with no extension
--a breakpoint can be permenant or once only, if once only its removed
--after detection here, these are used for temporary breakpoints in the
--debugger loop when executing the 'gotoo' command
--a breakpoint on line 0 of a file means any line in that file

local function has_breakpoint(file, line)
  local isLine = breakpoints[line]
  local isZero = breakpoints[0]
  if not isLine and not isZero then return false end
  local noext = string.gsub(file,"(%..-)$",'',1)
  if noext == file then noext = nil end
  while file do
    if isLine and isLine[file] then
      if isLine[file] == 1 then isLine[file] = nil end
      return true
    end
    if isZero and isZero[file] then
      if isZero[file] == 1 then isZero[file] = nil end
      return true
    end
    if IsWindows then
      file = string.match(file,"[:/\\](.+)$")
    else
      file = string.match(file,"[:/](.+)$")
    end
  end
  while noext do
    if isLine and isLine[noext] then
      if isLine[noext] == 1 then isLine[noext] = nil end
      return true
    end
    if isZero and isZero[noext] then
      if isZero[noext] == 1 then isZero[noext] = nil end
      return true
    end
    if IsWindows then
      noext = string.match(noext,"[:/\\](.+)$")
    else
      noext = string.match(noext,"[:/](.+)$")
    end
  end
  return false
end

--}}}
--{{{  local function capture_vars(ref,level,line)

local function capture_vars(ref,level,line)
  --get vars, file and line for the given level relative to debug_hook offset by ref

  local lvl = ref + level                --NB: This includes an offset of +1 for the call to here

  --{{{  capture variables
  
  local ar = debug.getinfo(lvl, "f")
  if not ar then return {},'?',0 end
  
  local vars = {__UPVALUES__={}, __LOCALS__={}}
  local i
  
  local func = ar.func
  if func then
    i = 1
    while true do
      local name, value = debug.getupvalue(func, i)
      if not name then break end
      if string.sub(name,1,1) ~= '(' then  --NB: ignoring internal control variables
        vars[name] = value
        vars.__UPVALUES__[i] = name
      end
      i = i + 1
    end
    vars.__ENVIRONMENT__ = getfenv(func)
  end
  
  vars.__GLOBALS__ = getfenv(0)
  
  i = 1
  while true do
    local name, value = debug.getlocal(lvl, i)
    if not name then break end
    if string.sub(name,1,1) ~= '(' then    --NB: ignoring internal control variables
      vars[name] = value
      vars.__LOCALS__[i] = name
    end
    i = i + 1
  end
  
  vars.__VARSLEVEL__ = level
  
  if func then
    --NB: Do not do this until finished filling the vars table
    setmetatable(vars, { __index = getfenv(func), __newindex = getfenv(func) })
  end
  
  --NB: Do not read or write the vars table anymore else the metatable functions will get invoked!
  
  --}}}

  local file = getinfo(lvl, "source")
  if string.find(file, "@") == 1 then
    file = string.sub(file, 2)
  end
  if IsWindows then file = string.lower(file) end

  if not line then
    line = getinfo(lvl, "currentline")
  end

  return vars,file,line

end

--}}}
--{{{  local function restore_vars(ref,vars)

local function restore_vars(ref,vars)

  if type(vars) ~= 'table' then return end

  local level = vars.__VARSLEVEL__       --NB: This level is relative to debug_hook offset by ref
  if not level then return end

  level = level + ref                    --NB: This includes an offset of +1 for the call to here

  local i
  local written_vars = {}

  i = 1
  while true do
    local name, value = debug.getlocal(level, i)
    if not name then break end
    if vars[name] and string.sub(name,1,1) ~= '(' then     --NB: ignoring internal control variables
      debug.setlocal(level, i, vars[name])
      written_vars[name] = true
    end
    i = i + 1
  end

  local ar = debug.getinfo(level, "f")
  if not ar then return end

  local func = ar.func
  if func then

    i = 1
    while true do
      local name, value = debug.getupvalue(func, i)
      if not name then break end
      if vars[name] and string.sub(name,1,1) ~= '(' then   --NB: ignoring internal control variables
        if not written_vars[name] then
          debug.setupvalue(func, i, vars[name])
        end
        written_vars[name] = true
      end
      i = i + 1
    end

  end

end

--}}}
--{{{  local function trace_event(event, line, level)

local function print_trace(level,depth,event,file,line,name)

  --NB: level here is relative to the caller of trace_event, so offset by 2 to get to there
  level = level + 2

  local file = file or getinfo(level,'short_src')
  local line = line or getinfo(level,'currentline')
  local name = name or getinfo(level,'name')

  local prefix = ''
  if current_thread ~= 'main' then prefix = '['..tostring(current_thread)..'] ' end

  io.write(prefix..
           string.format('%08.2f:%02i.',os.clock(),depth)..
           string.rep('.',depth%32)..
           (file or '')..' ('..(line or '')..') '..
           (name or '')..
           ' ('..event..')\n')

end

local function trace_event(event, line, level)

  if event == 'return' and trace_returns then
    --note the line info for later
    ret_file = getinfo(level+1,'short_src')
    ret_line = getinfo(level+1,'currentline')
    ret_name = getinfo(level+1,'name')
  end

  if event ~= 'line' then return end

  local slevel = stack_level[current_thread]
  local tlevel = trace_level[current_thread]

  if trace_calls and slevel > tlevel then
    --we are now in the function called, so look back 1 level further to find the calling file and line
    print_trace(level+1,slevel-1,'c',nil,nil,getinfo(level+1,'name'))
  end

  if trace_returns and slevel < tlevel then
    print_trace(level,slevel,'r',ret_file,ret_line,ret_name)
  end

  if trace_lines then
    print_trace(level,slevel,'l')
  end

  trace_level[current_thread] = stack_level[current_thread]

end

--}}}
--{{{  local function report(ev, vars, file, line, idx_watch)

local function report(ev, vars, file, line, idx_watch)
  function show_source()
    show(traceinfo[1].short_src, traceinfo[1].currentline, 2, 2)
  end

  local vars = vars or {}
  local file = file or '?'
  local line = line or 0
  local prefix = ''
  if current_thread ~= 'main' then prefix = '['..tostring(current_thread)..'] ' end
  if ev == events.STEP then
    io.write(prefix.."Paused at file "..file.." line "..line..' ('..stack_level[current_thread]..')\n')
    show_source()
  elseif ev == events.BREAK then
    io.write(prefix.."Paused at file "..file.." line "..line..' ('..stack_level[current_thread]..') (breakpoint)\n')
    show_source()
  elseif ev == events.WATCH then
    io.write(prefix.."Paused at file "..file.." line "..line..' ('..stack_level[current_thread]..')'.." (watch expression "..idx_watch.. ": ["..watches[idx_watch].exp.."])\n")
    show_source()
  elseif ev == events.SET then
    --do nothing
  else
    io.write(prefix.."Error in application: "..file.." line "..line.."\n")
  end
  if ev ~= events.SET then
    if pausemsg and pausemsg ~= '' then io.write('Message: '..pausemsg..'\n') end
    pausemsg = ''
  end
  return vars, file, line
end

--}}}

--{{{  local function debugger_loop(ev, vars, file, line, idx_watch)

local last_line = ""

local function debugger_loop(ev, vars, file, line, idx_watch)

  local eval_env  = vars or {}
  local breakfile = file or '?'
  local breakline = line or 0

  local command, args

  --{{{  local function getargs(spec)
  
  --get command arguments according to the given spec from the args string
  --the spec has a single character for each argument, arguments are separated
  --by white space, the spec characters can be one of:
  -- F for a filename    (defaults to breakfile if - given in args)
  -- L for a line number (defaults to breakline if - given in args)
  -- N for a number
  -- V for a variable name
  -- S for a string
  
  local function getargs(spec)
    local res={}
    local char,arg
    local ptr=1
    for i=1,string.len(spec) do
      char = string.sub(spec,i,i)
      if     char == 'F' then
        _,ptr,arg = string.find(args..' ',"%s*([%w%p]*)%s*",ptr)
        if not arg or arg == '' then arg = '-' end
        if arg == '-' then arg = breakfile end
      elseif char == 'L' then
        _,ptr,arg = string.find(args..' ',"%s*([%w%p]*)%s*",ptr)
        if not arg or arg == '' then arg = '-' end
        if arg == '-' then arg = breakline end
        arg = tonumber(arg) or 0
      elseif char == 'N' then
        _,ptr,arg = string.find(args..' ',"%s*([%w%p]*)%s*",ptr)
        if not arg or arg == '' then arg = '0' end
        arg = tonumber(arg) or 0
      elseif char == 'V' then
        _,ptr,arg = string.find(args..' ',"%s*([%w%p]*)%s*",ptr)
        if not arg or arg == '' then arg = '' end
      elseif char == 'S' then
        _,ptr,arg = string.find(args..' ',"%s*([%w%p]*)%s*",ptr)
        if not arg or arg == '' then arg = '' end
      else
        arg = ''
      end
      table.insert(res,arg or '')
    end
    return unpack(res)
  end
  
  --}}}

  while true do
    io.write("[DEBUG]> ")
    local line = io.read("*line")
    if line == nil then io.write('\n'); line = 'exit' end

    if line == "" then
        line = last_line
    else
        last_line = line
    end
    io.write("'" .. last_line .. "'\n")

    if string.find(line, "^[a-z]+") then
      command = string.sub(line, string.find(line, "^[a-z]+"))
      args    = string.gsub(line,"^[a-z]+%s*",'',1)            --strip command off line
    else
      command = ''
    end

    command = aliases[command] or command

    if command == "setb" then
      --{{{  set breakpoint
      
      local line, filename  = getargs('LF')
      if filename ~= '' and line ~= '' then
        set_breakpoint(filename,line)
        io.write("Breakpoint set in file "..filename..' line '..line..'\n')
      else
        io.write("Bad request\n")
      end
      
      --}}}

    elseif command == "delb" then
      --{{{  delete breakpoint
      
      local line, filename = getargs('LF')
      if filename ~= '' and line ~= '' then
        remove_breakpoint(filename, line)
        io.write("Breakpoint deleted from file "..filename..' line '..line.."\n")
      else
        io.write("Bad request\n")
      end
      
      --}}}

    elseif command == "delallb" then
      --{{{  delete all breakpoints
      breakpoints = {}
      io.write('All breakpoints deleted\n')
      --}}}

    elseif command == "listb" then
      --{{{  list breakpoints
      for i, v in pairs(breakpoints) do
        for ii, vv in pairs(v) do
          io.write("Break at: "..i..' in '..ii..'\n')
        end
      end
      --}}}

    elseif command == "setw" then
      --{{{  set watch expression
      
      if args and args ~= '' then
        local func = loadstring("return(" .. args .. ")")
        local newidx = #watches + 1
        watches[newidx] = {func = func, exp = args}
        io.write("Set watch exp no. " .. newidx..'\n')
      else
        io.write("Bad request\n")
      end
      
      --}}}

    elseif command == "delw" then
      --{{{  delete watch expression
      
      local index = tonumber(args)
      if index then
        watches[index] = nil
        io.write("Watch expression deleted\n")
      else
        io.write("Bad request\n")
      end
      
      --}}}

    elseif command == "delallw" then
      --{{{  delete all watch expressions
      watches = {}
      io.write('All watch expressions deleted\n')
      --}}}

    elseif command == "listw" then
      --{{{  list watch expressions
      for i, v in pairs(watches) do
        io.write("Watch exp. " .. i .. ": " .. v.exp..'\n')
      end
      --}}}

    elseif command == "run" then
      --{{{  run until breakpoint
      step_into = false
      step_over = false
      return 'cont'
      --}}}

    elseif command == "step" then
      --{{{  step N lines (into functions)
      local N = tonumber(args) or 1
      step_over  = false
      step_into  = true
      step_lines = tonumber(N or 1)
      return 'cont'
      --}}}

    elseif command == "over" then
      --{{{  step N lines (over functions)
      local N = tonumber(args) or 1
      step_into  = false
      step_over  = true
      step_lines = tonumber(N or 1)
      step_level[current_thread] = stack_level[current_thread]
      return 'cont'
      --}}}

    elseif command == "out" then
      --{{{  step N lines (out of functions)
      local N = tonumber(args) or 1
      step_into  = false
      step_over  = true
      step_lines = 1
      step_level[current_thread] = stack_level[current_thread] - tonumber(N or 1)
      return 'cont'
      --}}}

    elseif command == "gotoo" then
      --{{{  step until reach line
      local line, filename = getargs('LF')
      if line ~= '' then
        step_over  = false
        step_into  = false
        if has_breakpoint(filename,line) then
          return 'cont'
        else
          set_breakpoint(filename,line,true)
          return 'cont'
        end
      else
        io.write("Bad request\n")
      end
      --}}}

    elseif command == "set" then
      --{{{  set/show context level
      local level = args
      if level and level == '' then level = nil end
      if level then return level end
      --}}}

    elseif command == "vars" then
      --{{{  list context variables
      local depth = args
      if depth and depth == '' then depth = nil end
      depth = tonumber(depth) or 1
      dumpvar(eval_env, depth+1, 'variables')
      --}}}

    elseif command == "glob" then
      --{{{  list global variables
      local depth = args
      if depth and depth == '' then depth = nil end
      depth = tonumber(depth) or 1
      dumpvar(eval_env.__GLOBALS__,depth+1,'globals')
      --}}}

    elseif command == "fenv" then
      --{{{  list function environment variables
      local depth = args
      if depth and depth == '' then depth = nil end
      depth = tonumber(depth) or 1
      dumpvar(eval_env.__ENVIRONMENT__,depth+1,'environment')
      --}}}

    elseif command == "ups" then
      --{{{  list upvalue names
      dumpvar(eval_env.__UPVALUES__,2,'upvalues')
      --}}}

    elseif command == "locs" then
      --{{{  list locals names
      dumpvar(eval_env.__LOCALS__,2,'upvalues')
      --}}}

    elseif command == "what" then
      --{{{  show where a function is defined
      if args and args ~= '' then
        local v = eval_env
        local n = nil
        for w in string.gmatch(args,"[%w_]+") do
          v = v[w]
          if n then n = n..'.'..w else n = w end
          if not v then break end
        end
        if type(v) == 'function' then
          local def = debug.getinfo(v,'S')
          if def then
            io.write(def.what..' in '..def.short_src..' '..def.linedefined..'..'..def.lastlinedefined..'\n')
          else
            io.write('Cannot get info for '..v..'\n')
          end
        else
          io.write(v..' is not a function\n')
        end
      else
        io.write("Bad request\n")
      end
      --}}}

    elseif command == "dump" then
      --{{{  dump a variable
      local name, depth = getargs('VN')
      if name ~= '' then
        if depth == '' or depth == 0 then depth = nil end
        depth = tonumber(depth or 1)
        local v = eval_env
        local n = nil
        for w in string.gmatch(name,"[^%.]+") do     --get everything between dots
          if tonumber(w) then
            v = v[tonumber(w)]
          else
            v = v[w]
          end
          if n then n = n..'.'..w else n = w end
          if not v then break end
        end
        dumpvar(v,depth+1,n)
      else
        io.write("Bad request\n")
      end
      --}}}

    elseif command == "show" then
      --{{{  show file around a line or the current breakpoint
      
      local line, file, before, after = getargs('LFNN')
      if before == 0 then before = 10     end
      if after  == 0 then after  = before end
      
      if file ~= '' and file ~= "=stdin" then
        show(file,line,before,after)
      else
        io.write('Nothing to show\n')
      end
      
      --}}}

    elseif command == "poff" then
      --{{{  turn pause command off
      pause_off = true
      --}}}

    elseif command == "pon" then
      --{{{  turn pause command on
      pause_off = false
      --}}}

    elseif command == "tron" then
      --{{{  turn tracing on/off
      local option = getargs('S')
      trace_calls   = false
      trace_returns = false
      trace_lines   = false
      if string.find(option,'c') then trace_calls   = true end
      if string.find(option,'r') then trace_returns = true end
      if string.find(option,'l') then trace_lines   = true end
      --}}}

    elseif command == "trace" then
      --{{{  dump a stack trace
      trace(eval_env.__VARSLEVEL__)
      --}}}

    elseif command == "info" then
      --{{{  dump all debug info captured
      info()
      --}}}

    elseif command == "pause" then
      --{{{  not allowed in here
      io.write('pause() should only be used in the script you are debugging\n')
      --}}}

    elseif command == "help" then
      --{{{  help
      local command = getargs('S')
      if command ~= '' and hints[command] then
        io.write(hints[command]..'\n')
      else
        for _,v in pairs(hints) do
          local _,_,h = string.find(v,"(.+)|")
          io.write(h..'\n')
        end
      end
      --}}}

    elseif command == "exit" then
      --{{{  exit debugger
      return 'stop'
      --}}}

    elseif line ~= '' then
      --{{{  just execute whatever it is in the current context
      
      --map line starting with "=..." to "return ..."
      if string.sub(line,1,1) == '=' then line = string.gsub(line,'=','return ',1) end
      
      local ok, func = pcall(loadstring,line)
      if func == nil then                             --Michael.Bringmann@lsi.com
        io.write("Compile error: "..line..'\n')
      elseif not ok then
        io.write("Compile error: "..func..'\n')
      else
        setfenv(func, eval_env)
        local res = {pcall(func)}
        if res[1] then
          if res[2] then
            table.remove(res,1)
            for _,v in ipairs(res) do
              io.write(tostring(v))
              io.write('\t')
            end
            io.write('\n')
          end
          --update in the context
          return 0
        else
          io.write("Run error: "..res[2]..'\n')
        end
      end
      
      --}}}
    end
  end

end

--}}}
--{{{  local function debug_hook(event, line, level, thread)

local function debug_hook(event, line, level, thread)
  if not started then debug.sethook(); coro_debugger = nil; return end
  current_thread = thread or 'main'
  local level = level or 2
  trace_event(event,line,level)
  if event == "call" then
    stack_level[current_thread] = stack_level[current_thread] + 1
  elseif event == "return" then
    stack_level[current_thread] = stack_level[current_thread] - 1
    if stack_level[current_thread] < 0 then stack_level[current_thread] = 0 end
  else
    local vars,file,line = capture_vars(level,1,line)
    local stop, ev, idx = false, events.STEP, 0
    while true do
      for index, value in pairs(watches) do
        setfenv(value.func, vars)
        local status, res = pcall(value.func)
        if status and res then
          ev, idx = events.WATCH, index
          stop = true
          break
        end
      end
      if stop then break end
      if (step_into)
      or (step_over and (stack_level[current_thread] <= step_level[current_thread] or stack_level[current_thread] == 0)) then
        step_lines = step_lines - 1
        if step_lines < 1 then
          ev, idx = events.STEP, 0
          break
        end
      end
      if has_breakpoint(file, line) then
        ev, idx = events.BREAK, 0
        break
      end
      return
    end
    tracestack(level)
    if not coro_debugger then
      io.write("\nLua Debugger\n")
      vars, file, line = report(ev, vars, file, line, idx)
      io.write("Type 'help' for commands\n")
      coro_debugger = true
    else
      vars, file, line = report(ev, vars, file, line, idx)
    end
    local last_next = 1
    local next = 'ask'
    local silent = false
    while true do
      if next == 'ask' then
        next = debugger_loop(ev, vars, file, line, idx)
      elseif next == 'cont' then
        return
      elseif next == 'stop' then
        started = false
        debug.sethook()
        coro_debugger = nil
        return
      elseif tonumber(next) then --get vars for given level or last level
        next = tonumber(next)
        if next == 0 then silent = true; next = last_next else silent = false end
        last_next = next
        restore_vars(level,vars)
        vars, file, line = capture_vars(level,next)
        if not silent then
          if vars and vars.__VARSLEVEL__ then
            io.write('Level: '..vars.__VARSLEVEL__..'\n')
          else
            io.write('No level set\n')
          end
        end
        ev = events.SET
        next = 'ask'
      else
        io.write('Unknown command from debugger_loop: '..tostring(next)..'\n')
        io.write('Stopping debugger\n')
        next = 'stop'
      end
    end
  end
end

--}}}

--{{{  coroutine.create

--This function overrides the built-in for the purposes of propagating
--the debug hook settings from the creator into the created coroutine.

_G.coroutine.create = function(f)
  local thread
  local hook, mask, count = debug.gethook()
  if hook then
    local function thread_hook(event,line)
      hook(event,line,3,thread)
    end
    thread = cocreate(function(...)
                        stack_level[thread] = 0
                        trace_level[thread] = 0
                        step_level [thread] = 0
                        debug.sethook(thread_hook,mask,count)
                        return f(...)
                      end)
    return thread
  else
    return cocreate(f)
  end
end

--}}}
--{{{  coroutine.wrap

--This function overrides the built-in for the purposes of propagating
--the debug hook settings from the creator into the created coroutine.

_G.coroutine.wrap = function(f)
  local thread
  local hook, mask, count = debug.gethook()
  if hook then
    local function thread_hook(event,line)
      hook(event,line,3,thread)
    end
    thread = cowrap(function(...)
                      stack_level[thread] = 0
                      trace_level[thread] = 0
                      step_level [thread] = 0
                      debug.sethook(thread_hook,mask,count)
                      return f(...)
                    end)
    return thread
  else
    return cowrap(f)
  end
end

--}}}

--{{{  function pause(x,l,f)

--
-- Starts/resumes a debug session
--

function pause(x,l,f)
  if not f and pause_off then return end       --being told to ignore pauses
  pausemsg = x or 'pause'
  local lines
  local src = getinfo(2,'short_src')
  if l then
    lines = l   --being told when to stop
  elseif src == "stdin" then
    lines = 1   --if in a console session, stop now
  else
    lines = 2   --if in a script, stop when get out of pause()
  end
  if started then
    --we'll stop now 'cos the existing debug hook will grab us
    step_lines = lines
    step_into  = true
    debug.sethook(debug_hook, "crl")         --reset it in case some external agent fiddled with it
  else
    --set to stop when get out of pause()
    trace_level[current_thread] = 0
    step_level [current_thread] = 0
    stack_level[current_thread] = 1
    step_lines = lines
    step_into  = true
    started    = true
    debug.sethook(debug_hook, "crl")         --NB: this will cause an immediate entry to the debugger_loop
  end
end

--}}}
--{{{  function dump(v,depth)

--shows the value of the given variable, only really useful
--when the variable is a table
--see dump debug command hints for full semantics

function dump(v,depth)
  dumpvar(v,(depth or 1)+1,tostring(v))
end

--}}}
--{{{  function debug.traceback(x)

local _traceback = debug.traceback       --note original function

--override standard function
debug.traceback = function(x)
  local assertmsg = _traceback(x)        --do original function
  pause(x)                               --let user have a look at stuff
  return assertmsg                       --carry on
end

_TRACEBACK = debug.traceback             --Lua 5.0 function

--}}}

--------------------------------------------------------------------------------
-- dir.lua
--

--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
function dir_match_generator_impl(text)
    -- Strip off any path components that may be on text.
    local prefix = ""
    local i = text:find("[\\/:][^\\/:]*$")
    if i then
        prefix = text:sub(1, i)
    end

    local include_dots = text:find("%.+$") ~= nil

    local matches = {}
    local mask = text.."*"

    -- Find matches.
    for _, dir in ipairs(clink.find_dirs(mask, true)) do
        local file = prefix..dir

        if include_dots or (dir ~= "." and dir ~= "..") then
            if clink.is_match(text, file) then
                table.insert(matches, prefix..dir)
            end
        end
    end

    return matches
end

--------------------------------------------------------------------------------
local function dir_match_generator(word)
    local matches = dir_match_generator_impl(word)

    -- If there was no matches but text is a dir then use it as the single match.
    -- Otherwise tell readline that matches are files and it will do magic.
    if #matches == 0 then
        if clink.is_dir(rl_state.text) then
            table.insert(matches, rl_state.text)
        end
    else
        clink.matches_are_files()
    end

    return matches
end

--------------------------------------------------------------------------------
clink.arg.register_parser("cd", dir_match_generator)
clink.arg.register_parser("chdir", dir_match_generator)
clink.arg.register_parser("pushd", dir_match_generator)
clink.arg.register_parser("rd", dir_match_generator)
clink.arg.register_parser("rmdir", dir_match_generator)
clink.arg.register_parser("md", dir_match_generator)
clink.arg.register_parser("mkdir", dir_match_generator)

-- vim: expandtab

--------------------------------------------------------------------------------
-- env.lua
--

--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
local special_env_vars = {
    "cd", "date", "time", "random", "errorlevel",
    "cmdextversion", "cmdcmdline", "highestnumanodenumber"
}

--------------------------------------------------------------------------------
local function env_vars_display_filter(matches)
    local to_display = {}
    for _, m in ipairs(matches) do
        local _, _, out = m:find("(%%[^%%]+%%)$")
        table.insert(to_display, out)
    end

    return to_display
end

--------------------------------------------------------------------------------
local function env_vars_find_matches(candidates, prefix, part)
    local part_len = #part
    for _, name in ipairs(candidates) do
        if clink.lower(name:sub(1, part_len)) == part then
            clink.add_match(prefix..'%'..name:lower()..'%')
        end
    end
end

--------------------------------------------------------------------------------
local function env_vars_match_generator(text, first, last)
    local all = rl_state.line_buffer:sub(1, last)

    -- Skip pairs of %s
    local i = 1
    for _, r in function () return all:find("%b%%", i) end do
        i = r + 2
    end

    -- Find a solitary %
    local i = all:find("%%", i)
    if not i then
        return false
    end

    if i < first then
        return false
    end

    local part = clink.lower(all:sub(i + 1))
    local part_len = #part

    i = i - first
    local prefix = text:sub(1, i)

    env_vars_find_matches(clink.get_env_var_names(), prefix, part)
    env_vars_find_matches(special_env_vars, prefix, part)

    if clink.match_count() >= 1 then
        clink.match_display_filter = env_vars_display_filter

        clink.suppress_char_append()
        clink.suppress_quoting()

        return true
    end

    return false
end

--------------------------------------------------------------------------------
if clink.get_host_process() == "cmd.exe" then
    clink.register_match_generator(env_vars_match_generator, 10)
end

-- vim: expandtab

--------------------------------------------------------------------------------
-- exec.lua
--

--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
local dos_commands = {
    "assoc", "break", "call", "cd", "chcp", "chdir", "cls", "color", "copy",
    "date", "del", "dir", "diskcomp", "diskcopy", "echo", "endlocal", "erase",
    "exit", "for", "format", "ftype", "goto", "graftabl", "if", "md", "mkdir",
    "mklink", "more", "move", "path", "pause", "popd", "prompt", "pushd", "rd",
    "rem", "ren", "rename", "rmdir", "set", "setlocal", "shift", "start",
    "time", "title", "tree", "type", "ver", "verify", "vol"
}

--------------------------------------------------------------------------------
local function get_environment_paths()
    local paths = clink.split(clink.get_env("PATH"), ";")

    -- We're expecting absolute paths and as ';' is a valid path character
    -- there maybe unneccessary splits. Here we resolve them.
    local paths_merged = { paths[1] }
    for i = 2, #paths, 1 do
        if not paths[i]:find("^[a-zA-Z]:") then
            local t = paths_merged[#paths_merged];
            paths_merged[#paths_merged] = t..paths[i]
        else
            table.insert(paths_merged, paths[i])
        end
    end

    -- Append slashes.
    for i = 1, #paths_merged, 1 do
        paths_merged[i] = paths_merged[i].."/"
    end

    return paths_merged
end

--------------------------------------------------------------------------------
local function exec_find_dirs(pattern, case_map)
    local ret = {}

    for _, dir in ipairs(clink.find_dirs(pattern, case_map)) do
        if dir ~= "." and dir ~= ".." then
            table.insert(ret, dir)
        end
    end

    return ret
end

--------------------------------------------------------------------------------
local function exec_match_generator(text, first, last)
    -- If match style setting is < 0 then consider executable matching disabled.
    local match_style = clink.get_setting_int("exec_match_style")
    if match_style < 0 then
        return false
    end

    -- We're only interested in exec completion if this is the first word of the
    -- line, or the first word after a command separator.
    if clink.get_setting_int("space_prefix_match_files") > 0 then
        if first > 1 then
            return false
        end
    else
        local leading = rl_state.line_buffer:sub(1, first - 1)
        local is_first = leading:find("^%s*\"*$")
        if not is_first then
            return false
        end
    end

    -- Split text into directory and name
    local text_dir = ""
    local text_name = text
    local i = text:find("[\\/:][^\\/:]*$")
    if i then
        text_dir = text:sub(1, i)
        text_name = text:sub(i + 1)
    end

    local paths
    if not text:find("[\\/:]") then
        -- If the terminal is cmd.exe check it's commands for matches.
        if clink.get_host_process() == "cmd.exe" then
            clink.match_words(text, dos_commands)
        end

        -- Add console aliases as matches.
        local aliases = clink.get_console_aliases()
        clink.match_words(text, aliases)

        paths = get_environment_paths();
    else
        paths = {}

        -- 'text' is an absolute or relative path. If we're doing Bash-style
        -- matching should now consider directories.
        if match_style < 1 then
            match_style = 2
        else
            match_style = 1
        end
    end

    -- Should we also consider the path referenced by 'text'?
    if match_style >= 1 then
        table.insert(paths, text_dir)
    end

    -- Search 'paths' for files ending in 'suffices' and look for matches
    local suffices = clink.split(clink.get_env("pathext"), ";")
    for _, suffix in ipairs(suffices) do
        for _, path in ipairs(paths) do
            local files = clink.find_files(path.."*"..suffix, false)
            for _, file in ipairs(files) do
                if clink.is_match(text_name, file) then
                    clink.add_match(text_dir..file)
                end
            end
        end
    end

    -- Lastly we may wish to consider directories too.
    if clink.match_count() == 0 or match_style >= 2 then
        clink.match_files(text.."*", true, exec_find_dirs)
    end

    clink.matches_are_files()
    return true
end

--------------------------------------------------------------------------------
clink.register_match_generator(exec_match_generator, 50)

-- vim: expandtab

--------------------------------------------------------------------------------
-- git.lua
--

--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
local git_argument_tree = {
    -- Porcelain and ancillary commands from git's man page.
    "add", "am", "archive", "bisect", "branch", "bundle", "checkout",
    "cherry-pick", "citool", "clean", "clone", "commit", "describe", "diff",
    "fetch", "format-patch", "gc", "grep", "gui", "init", "log", "merge", "mv",
    "notes", "pull", "push", "rebase", "reset", "revert", "rm", "shortlog",
    "show", "stash", "status", "submodule", "tag", "config", "fast-export",
    "fast-import", "filter-branch", "lost-found", "mergetool", "pack-refs",
    "prune", "reflog", "relink", "remote", "repack", "replace", "repo-config",
    "annotate", "blame", "cherry", "count-objects", "difftool", "fsck",
    "get-tar-commit-id", "help", "instaweb", "merge-tree", "rerere",
    "rev-parse", "show-branch", "verify-tag", "whatchanged"
}

clink.arg.register_parser("git", git_argument_tree)

-- vim: expandtab

--------------------------------------------------------------------------------
-- go.lua
--

--
-- Copyright (c) 2013 Dobroslaw Zybort
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
local function flags(...)
    local p = clink.arg.new_parser()
    p:set_flags(...)
    return p
end

--------------------------------------------------------------------------------
local go_tool_parser = clink.arg.new_parser()
go_tool_parser:set_flags("-n")
go_tool_parser:set_arguments({
    "8a", "8c", "8g", "8l", "addr2line", "cgo", "dist", "nm", "objdump",
    "pack",
    "cover" .. flags("-func", "-html", "-mode", "-o", "-var"),
    "fix"   .. flags("-diff", "-force", "-r"),
    "prof"  .. flags("-p", "-t", "-d", "-P", "-h", "-f", "-l", "-r", "-s",
                     "-hs"),
    "pprof" .. flags(-- Options:
                     "--cum", "--base", "--interactive", "--seconds",
                     "--add_lib", "--lib_prefix",
                     -- Reporting Granularity:
                     "--addresses", "--lines", "--functions", "--files",
                     -- Output type:
                     "--text", "--callgrind", "--gv", "--web", "--list",
                     "--disasm", "--symbols", "--dot", "--ps", "--pdf",
                     "--svg", "--gif", "--raw",
                     -- Heap-Profile Options:
                     "--inuse_space", "--inuse_objects", "--alloc_space",
                     "--alloc_objects", "--show_bytes", "--drop_negative",
                     -- Contention-profile options:
                     "--total_delay", "--contentions", "--mean_delay",
                     -- Call-graph Options:
                     "--nodecount", "--nodefraction", "--edgefraction",
                     "--focus", "--ignore", "--scale", "--heapcheck",
                     -- Miscellaneous:
                     "--tools", "--test", "--help", "--version"),
    "vet"   .. flags("-all", "-asmdecl", "-assign", "-atomic", "-buildtags",
                     "-composites", "-compositewhitelist", "-copylocks",
                     "-methods", "-nilfunc", "-printf", "-printfuncs",
                     "-rangeloops", "-shadow", "-shadowstrict", "-structtags",
                     "-test", "-unreachable", "-v"),
    "yacc"  .. flags("-l", "-o", "-p", "-v"),
})

--------------------------------------------------------------------------------
local go_parser = clink.arg.new_parser()
go_parser:set_arguments({
    "env",
    "fix",
    "version",
    "build"    .. flags("-o", "-a", "-n", "-p", "-installsuffix", "-v", "-x",
                        "-work", "-gcflags", "-ccflags", "-ldflags",
                        "-gccgoflags", "-tags", "-compiler", "-race"),
    "clean"    .. flags("-i", "-n", "-r", "-x"),
    "fmt"      .. flags("-n", "-x"),
    "get"      .. flags("-d", "-fix", "-t", "-u",
                        -- Build flags
                        "-a", "-n", "-p", "-installsuffix", "-v", "-x",
                        "-work", "-gcflags", "-ccflags", "-ldflags",
                        "-gccgoflags", "-tags", "-compiler", "-race"),
    "install"  .. flags(-- All `go build` flags
                        "-o", "-a", "-n", "-p", "-installsuffix", "-v", "-x",
                        "-work", "-gcflags", "-ccflags", "-ldflags",
                        "-gccgoflags", "-tags", "-compiler", "-race"),
    "list"     .. flags("-e", "-race", "-f", "-json", "-tags"),
    "run"      .. flags("-exec",
                        -- Build flags
                        "-a", "-n", "-p", "-installsuffix", "-v", "-x",
                        "-work", "-gcflags", "-ccflags", "-ldflags",
                        "-gccgoflags", "-tags", "-compiler", "-race"),
    "test"     .. flags(-- Local.
                        "-c", "-file", "-i", "-cover", "-coverpkg",
                        -- Build flags
                        "-a", "-n", "-p", "-x", "-work", "-ccflags",
                        "-gcflags", "-exec", "-ldflags", "-gccgoflags",
                        "-tags", "-compiler", "-race", "-installsuffix", 
                        -- Passed to 6.out
                        "-bench", "-benchmem", "-benchtime", "-covermode",
                        "-coverprofile", "-cpu", "-cpuprofile", "-memprofile",
                        "-memprofilerate", "-blockprofile",
                        "-blockprofilerate", "-outputdir", "-parallel", "-run",
                        "-short", "-timeout", "-v"),
    "tool"     .. go_tool_parser,
    "vet"      .. flags("-n", "-x"),
})

--------------------------------------------------------------------------------
local go_help_parser = clink.arg.new_parser()
go_help_parser:set_arguments({
    "help" .. clink.arg.new_parser():set_arguments({
        go_parser:flatten_argument(1)
    })
})

--------------------------------------------------------------------------------
local godoc_parser = clink.arg.new_parser()
godoc_parser:set_flags(
    "-zip", "-write_index", "-analysis", "-http", "-server", "-html","-src",
    "-url", "-q", "-v", "-goroot", "-tabwidth", "-timestamps", "-templates",
    "-play", "-ex", "-links", "-index", "-index_files", "-maxresults",
    "-index_throttle", "-notes", "-httptest.serve"
)

--------------------------------------------------------------------------------
local gofmt_parser = clink.arg.new_parser()
gofmt_parser:set_flags(
    "-cpuprofile", "-d", "-e", "-l", "-r", "-s", "-w"
)

--------------------------------------------------------------------------------
clink.arg.register_parser("go", go_parser)
clink.arg.register_parser("go", go_help_parser)
clink.arg.register_parser("godoc", godoc_parser)
clink.arg.register_parser("gofmt", gofmt_parser)

--------------------------------------------------------------------------------
-- hg.lua
--

--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
local hg_tree = {
    "add", "addremove", "annotate", "archive", "backout", "bisect", "bookmarks",
    "branch", "branches", "bundle", "cat", "clone", "commit", "copy", "diff",
    "export", "forget", "grep", "heads", "help", "identify", "import",
    "incoming", "init", "locate", "log", "manifest", "merge", "outgoing",
    "parents", "paths", "pull", "push", "recover", "remove", "rename", "resolve",
    "revert", "rollback", "root", "serve", "showconfig", "status", "summary",
    "tag", "tags", "tip", "unbundle", "update", "verify", "version", "graft",
    "phases"
}

clink.arg.register_parser("hg", hg_tree)

-- vim: expandtab

--------------------------------------------------------------------------------
-- p4.lua
--

--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
local p4_tree = {
    "add", "annotate", "attribute", "branch", "branches", "browse", "change",
    "changes", "changelist", "changelists", "client", "clients", "copy",
    "counter", "counters", "cstat", "delete", "depot", "depots", "describe",
    "diff", "diff2", "dirs", "edit", "filelog", "files", "fix", "fixes",
    "flush", "fstat", "grep", "group", "groups", "have", "help", "info",
    "integrate", "integrated", "interchanges", "istat", "job", "jobs", "label",
    "labels", "labelsync", "legal", "list", "lock", "logger", "login",
    "logout", "merge", "move", "opened", "passwd", "populate", "print",
    "protect", "protects", "reconcile", "rename", "reopen", "resolve",
    "resolved", "revert", "review", "reviews", "set", "shelve", "status",
    "sizes", "stream", "streams", "submit", "sync", "tag", "tickets", "unlock",
    "unshelve", "update", "user", "users", "where", "workspace", "workspaces"
}

clink.arg.register_parser("p4", p4_tree)

--------------------------------------------------------------------------------
local p4vc_tree = {
    "help", "branchmappings", "branches", "diff", "groups", "branch", "change",
    "client", "workspace", "depot", "group", "job", "label", "user", "jobs",
    "labels", "pendingchanges", "resolve", "revisiongraph", "revgraph",
    "streamgraph", "streams", "submit", "submittedchanges", "timelapse",
    "timelapseview", "tlv", "users", "workspaces", "clients", "shutdown"
}

clink.arg.register_parser("p4vc", p4vc_tree)

-- vim: expandtab

--------------------------------------------------------------------------------
-- powershell.lua
--

--
-- Copyright (c) 2013 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
local function powershell_prompt_filter()
    local l, r, path = clink.prompt.value:find("([a-zA-Z]:\\.*)> $")
    if path ~= nil then
        clink.chdir(path)
    end
end

--------------------------------------------------------------------------------
if clink.get_host_process() == "powershell.exe" then
    clink.prompt.register_filter(powershell_prompt_filter, -493)
end

--------------------------------------------------------------------------------
-- self.lua
--

--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
local null_parser = clink.arg.new_parser()
null_parser:disable_file_matching()

local inject_parser = clink.arg.new_parser()
inject_parser:set_flags(
    "--help",
    "--nohostcheck",
    "--pid",
    "--profile",
    "--quiet",
    "--scripts"
)

local autorun_dashdash_parser = clink.arg.new_parser()
autorun_dashdash_parser:set_arguments({ "--" .. inject_parser })

local autorun_parser = clink.arg.new_parser()
autorun_parser:set_flags("--allusers", "--help")
autorun_parser:set_arguments(
    {
        "install"   .. autorun_dashdash_parser,
        "uninstall" .. null_parser,
        "show"      .. null_parser,
        "set"
    }
)

local set_parser = clink.arg.new_parser()
set_parser:disable_file_matching()
set_parser:set_flags("--help")
set_parser:set_arguments(
    {
        "ansi_code_support",
        "ctrld_exits",
        "esc_clears_line",
        "exec_match_style",
        "history_dupe_mode",
        "history_expand_mode",
        "history_file_lines",
        "history_ignore_space",
        "history_io",
        "match_colour",
        "prompt_colour",
        "space_prefix_match_files",
        "strip_crlf_on_paste",
        "terminate_autoanswer",
        "use_altgr_substitute",
    }
)

local self_parser = clink.arg.new_parser()
self_parser:set_arguments(
    {
        "inject" .. inject_parser,
        "autorun" .. autorun_parser,
        "set" .. set_parser,
    }
)

clink.arg.register_parser("clink", self_parser)
clink.arg.register_parser("clink_x86", self_parser)
clink.arg.register_parser("clink_x64", self_parser)

-- vim: expandtab

--------------------------------------------------------------------------------
-- set.lua
--

--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
local function set_match_generator(word)
    -- Skip this generator if first is in the rvalue.
    local leading = rl_state.line_buffer:sub(1, rl_state.first - 1)
    if leading:find("=") then
        return false
    end

    -- Enumerate environment variables and check for potential matches.
    local matches = {}
    for _, name in ipairs(clink.get_env_var_names()) do
        if clink.is_match(word, name) then
            table.insert(matches, name:lower())
        end
    end

    clink.suppress_char_append()
    return matches
end

--------------------------------------------------------------------------------
clink.arg.register_parser("set", set_match_generator)

-- vim: expandtab

--------------------------------------------------------------------------------
-- svn.lua
--

--
-- Copyright (c) 2012 Martin Ridgers
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy
-- of this software and associated documentation files (the "Software"), to deal
-- in the Software without restriction, including without limitation the rights
-- to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-- copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- The above copyright notice and this permission notice shall be included in
-- all copies or substantial portions of the Software.
--
-- THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-- IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-- FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-- AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-- LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-- SOFTWARE.
--

--------------------------------------------------------------------------------
local svn_tree = {
    "add", "blame", "praise", "annotate", "ann", "cat", "changelist", "cl",
    "checkout", "co", "cleanup", "commit", "ci", "copy", "cp", "delete", "del",
    "remove", "rm", "diff", "di", "export", "help", "h", "import", "info",
    "list", "ls", "lock", "log", "merge", "mergeinfo", "mkdir", "move", "mv",
    "rename", "ren", "propdel", "pdel", "pd", "propedit", "pedit", "pe",
    "propget", "pget", "pg", "proplist", "plist", "pl", "propset", "pset", "ps",
    "resolve", "resolved", "revert", "status", "stat", "st", "switch", "sw",
    "unlock", "update", "up"
}

clink.arg.register_parser("svn", svn_tree)

-- vim: expandtab
